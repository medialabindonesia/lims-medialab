import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import {
  getCell,
  integer,
  missingHeaders,
  money,
  normalizeCode,
  optionalYes,
  readHeaderMap,
} from "@/lib/excel-import";
import { parseDurations, SHEETS } from "@/lib/marketing-master-workbook";

export const runtime = "nodejs";

/**
 * Mengunggah balik berkas master marketing hasil unduhan.
 *
 * Sifatnya upsert berdasarkan kolom kode, sehingga mengunggah berkas yang sama
 * dua kali tidak menggandakan data. Baris yang DIHAPUS dari Excel tidak ikut
 * terhapus di database — penonaktifan dilakukan lewat kolom `isActive`, supaya
 * satu berkas yang tidak lengkap tidak bisa memusnahkan master data.
 *
 * Sengaja tidak dibungkus satu transaksi besar: sebuah berkas bisa berisi
 * ratusan baris dan transaksi sepanjang itu akan melewati batas waktu pada
 * koneksi VPS. Karena setiap operasi bersifat idempoten, import yang gagal di
 * tengah cukup diulang.
 */

const MAX_MATRIX_DEPTH = 10;

type ImportSummary = {
  matrixCreated: number;
  matrixUpdated: number;
  regulationCreated: number;
  regulationUpdated: number;
  parameterCreated: number;
  parameterUpdated: number;
  analysisParameterCreated: number;
  durationCreated: number;
};

export async function POST(request: Request) {
  const permission = await requireAnyApiPermission([
    { menuKey: "master.marketing", action: "canCreate" },
    { menuKey: "master.parameters", action: "canCreate" },
    { menuKey: "admin.rbac", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const summary: ImportSummary = {
    matrixCreated: 0,
    matrixUpdated: 0,
    regulationCreated: 0,
    regulationUpdated: 0,
    parameterCreated: 0,
    parameterUpdated: 0,
    analysisParameterCreated: 0,
    durationCreated: 0,
  };

  const errors: string[] = [];

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "File Excel wajib diupload" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]
    );

    const matrixSheet = workbook.getWorksheet(SHEETS.matrices);
    const regulationSheet = workbook.getWorksheet(SHEETS.regulations);
    const parameterSheet = workbook.getWorksheet(SHEETS.parameters);

    if (!matrixSheet || !regulationSheet || !parameterSheet) {
      return NextResponse.json(
        {
          message: `Berkas harus memiliki sheet "${SHEETS.matrices}", "${SHEETS.regulations}", dan "${SHEETS.parameters}". Unduh berkas terbaru lewat tombol Unduh, lalu sunting berkas itu.`,
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------- matriks
    const matrixHeaders = readHeaderMap(matrixSheet);
    const missingMatrix = missingHeaders(matrixHeaders, ["code", "name"]);

    if (missingMatrix.length) {
      return NextResponse.json(
        {
          message: `Sheet ${SHEETS.matrices}: kolom wajib hilang — ${missingMatrix.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // parentCode disimpan dulu, baru dipasang setelah semua baris ada, karena
    // baris induk boleh berada di bawah baris anaknya.
    const pendingParents = new Map<string, string>();

    for (let rowNumber = 2; rowNumber <= matrixSheet.rowCount; rowNumber++) {
      const row = matrixSheet.getRow(rowNumber);

      const rawCode = getCell(row, matrixHeaders, "code");
      const name = getCell(row, matrixHeaders, "name");

      if (!rawCode && !name) continue;

      if (!name) {
        errors.push(`${SHEETS.matrices} baris ${rowNumber}: kolom name kosong`);
        continue;
      }

      const code = normalizeCode(rawCode || name);

      if (!code) {
        errors.push(
          `${SHEETS.matrices} baris ${rowNumber}: code tidak menghasilkan kode yang valid`
        );
        continue;
      }

      const parentCode = getCell(row, matrixHeaders, "parentCode");
      if (parentCode) {
        const normalizedParent = normalizeCode(parentCode);

        if (normalizedParent === code) {
          errors.push(
            `${SHEETS.matrices} baris ${rowNumber}: parentCode tidak boleh sama dengan code-nya sendiri`
          );
        } else {
          pendingParents.set(code, normalizedParent);
        }
      }

      const data = {
        name,
        note: getCell(row, matrixHeaders, "note"),
        sort: integer(getCell(row, matrixHeaders, "sort"), 0),
        isActive: optionalYes(getCell(row, matrixHeaders, "isActive")) ?? true,
      };

      const existing = await prisma.matrix.findUnique({ where: { code } });

      if (existing) {
        await prisma.matrix.update({ where: { code }, data });
        summary.matrixUpdated += 1;
      } else {
        await prisma.matrix.create({ data: { ...data, code } });
        summary.matrixCreated += 1;
      }
    }

    // Pemasangan induk beserta deteksi lingkaran.
    const allMatrices = await prisma.matrix.findMany({
      select: { id: true, code: true, parentId: true },
    });
    const matrixByCode = new Map(allMatrices.map((item) => [item.code, item]));

    for (const [code, parentCode] of pendingParents) {
      const child = matrixByCode.get(code);
      const parent = matrixByCode.get(parentCode);

      if (!child) continue;

      if (!parent) {
        errors.push(
          `${SHEETS.matrices}: parentCode "${parentCode}" untuk "${code}" tidak ditemukan`
        );
        continue;
      }

      // Telusuri ke atas dari calon induk: kalau bertemu si anak, pemasangan
      // ini akan membuat lingkaran dan cascade di form quotation tidak akan
      // pernah berhenti.
      let cursor: string | null = parent.id;
      let createsCycle = false;

      for (let depth = 0; depth < MAX_MATRIX_DEPTH && cursor; depth += 1) {
        if (cursor === child.id) {
          createsCycle = true;
          break;
        }

        const node = allMatrices.find((item) => item.id === cursor);
        cursor = node?.parentId ?? null;
      }

      if (createsCycle) {
        errors.push(
          `${SHEETS.matrices}: "${code}" tidak bisa berinduk ke "${parentCode}" karena membentuk lingkaran`
        );
        continue;
      }

      if (child.parentId !== parent.id) {
        await prisma.matrix.update({
          where: { id: child.id },
          data: { parentId: parent.id },
        });
        child.parentId = parent.id;
      }
    }

    // ------------------------------------------------------------ regulasi
    const regulationHeaders = readHeaderMap(regulationSheet);
    const missingRegulation = missingHeaders(regulationHeaders, [
      "code",
      "name",
      "matrixCode",
    ]);

    if (missingRegulation.length) {
      return NextResponse.json(
        {
          message: `Sheet ${SHEETS.regulations}: kolom wajib hilang — ${missingRegulation.join(", ")}`,
        },
        { status: 400 }
      );
    }

    for (let rowNumber = 2; rowNumber <= regulationSheet.rowCount; rowNumber++) {
      const row = regulationSheet.getRow(rowNumber);

      const rawCode = getCell(row, regulationHeaders, "code");
      const name = getCell(row, regulationHeaders, "name");

      if (!rawCode && !name) continue;

      if (!name) {
        errors.push(
          `${SHEETS.regulations} baris ${rowNumber}: kolom name kosong`
        );
        continue;
      }

      const code = normalizeCode(rawCode || name);
      const matrixCode = normalizeCode(
        getCell(row, regulationHeaders, "matrixCode") || ""
      );
      const matrix = matrixByCode.get(matrixCode);

      if (!matrix) {
        errors.push(
          `${SHEETS.regulations} baris ${rowNumber}: matrixCode "${matrixCode}" tidak ada di sheet ${SHEETS.matrices}`
        );
        continue;
      }

      const data = {
        name,
        shortName: getCell(row, regulationHeaders, "shortName"),
        note: getCell(row, regulationHeaders, "note"),
        matrixId: matrix.id,
        sort: integer(getCell(row, regulationHeaders, "sort"), 0),
        isActive:
          optionalYes(getCell(row, regulationHeaders, "isActive")) ?? true,
      };

      const existing = await prisma.regulation.findUnique({ where: { code } });

      if (existing) {
        await prisma.regulation.update({ where: { code }, data });
        summary.regulationUpdated += 1;
      } else {
        await prisma.regulation.create({ data: { ...data, code } });
        summary.regulationCreated += 1;
      }
    }

    // ----------------------------------------------------------- parameter
    const parameterHeaders = readHeaderMap(parameterSheet);
    const missingParameter = missingHeaders(parameterHeaders, [
      "regulationCode",
      "parameterName",
    ]);

    if (missingParameter.length) {
      return NextResponse.json(
        {
          message: `Sheet ${SHEETS.parameters}: kolom wajib hilang — ${missingParameter.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const regulationByCode = new Map(
      (
        await prisma.regulation.findMany({ select: { id: true, code: true } })
      ).map((item) => [item.code, item])
    );

    // Cache durasi agar label yang sama di ratusan baris tidak menghasilkan
    // ratusan query.
    const durationByCode = new Map(
      (
        await prisma.samplingDuration.findMany({
          select: { id: true, code: true },
        })
      ).map((item) => [item.code, item.id])
    );

    for (let rowNumber = 2; rowNumber <= parameterSheet.rowCount; rowNumber++) {
      const row = parameterSheet.getRow(rowNumber);

      const regulationCode = getCell(row, parameterHeaders, "regulationCode");
      const parameterName = getCell(row, parameterHeaders, "parameterName");

      if (!regulationCode && !parameterName) continue;

      if (!parameterName) {
        errors.push(
          `${SHEETS.parameters} baris ${rowNumber}: kolom parameterName kosong`
        );
        continue;
      }

      const regulation = regulationByCode.get(
        normalizeCode(regulationCode || "")
      );

      if (!regulation) {
        errors.push(
          `${SHEETS.parameters} baris ${rowNumber}: regulationCode "${regulationCode}" tidak ada di sheet ${SHEETS.regulations}`
        );
        continue;
      }

      const unit = getCell(row, parameterHeaders, "unit");
      const method = getCell(row, parameterHeaders, "method");

      // AnalysisParameter adalah tabel milik bersama dengan modul COA.
      // Baris baru boleh ditambahkan, tetapi kolom baris yang sudah ada tidak
      // disentuh dari sini — termasuk `price`, yang kini digantikan basePrice
      // per regulasi.
      let analysisParameter = await prisma.analysisParameter.findFirst({
        where: { name: parameterName },
        select: { id: true },
      });

      if (!analysisParameter) {
        analysisParameter = await prisma.analysisParameter.create({
          data: { name: parameterName, unit, method },
          select: { id: true },
        });
        summary.analysisParameterCreated += 1;
      }

      const data = {
        displayName: getCell(row, parameterHeaders, "displayName"),
        unit,
        method,
        limitValue: getCell(row, parameterHeaders, "limitValue"),
        // null berarti belum ditetapkan; berbeda dari 0.
        basePrice: money(getCell(row, parameterHeaders, "basePrice")),
        isAccredited:
          optionalYes(getCell(row, parameterHeaders, "isAccredited")) ?? true,
        defaultSelected:
          optionalYes(getCell(row, parameterHeaders, "defaultSelected")) ?? true,
        sort: integer(getCell(row, parameterHeaders, "sort"), rowNumber),
        isActive:
          optionalYes(getCell(row, parameterHeaders, "isActive")) ?? true,
      };

      const existing = await prisma.regulationParameter.findUnique({
        where: {
          regulationId_parameterId: {
            regulationId: regulation.id,
            parameterId: analysisParameter.id,
          },
        },
        select: { id: true },
      });

      const regulationParameter = existing
        ? await prisma.regulationParameter.update({
            where: { id: existing.id },
            data,
            select: { id: true },
          })
        : await prisma.regulationParameter.create({
            data: {
              ...data,
              regulationId: regulation.id,
              parameterId: analysisParameter.id,
            },
            select: { id: true },
          });

      if (existing) summary.parameterUpdated += 1;
      else summary.parameterCreated += 1;

      // ------------------------------------------------------------ durasi
      const parsed = parseDurations(getCell(row, parameterHeaders, "durations"));

      const keptDurationIds: string[] = [];

      for (const [index, entry] of parsed.entries()) {
        const durationCode = normalizeCode(entry.label);
        if (!durationCode) continue;

        let durationId = durationByCode.get(durationCode);

        if (!durationId) {
          const created = await prisma.samplingDuration.create({
            data: {
              code: durationCode,
              label: entry.label,
              sort: index,
            },
            select: { id: true },
          });

          durationId = created.id;
          durationByCode.set(durationCode, durationId);
          summary.durationCreated += 1;
        }

        keptDurationIds.push(durationId);

        await prisma.regulationParameterDuration.upsert({
          where: {
            regulationParameterId_durationId: {
              regulationParameterId: regulationParameter.id,
              durationId,
            },
          },
          create: {
            regulationParameterId: regulationParameter.id,
            durationId,
            limitValue: entry.limitValue,
            isDefault: entry.isDefault,
            sort: index,
          },
          update: {
            limitValue: entry.limitValue,
            isDefault: entry.isDefault,
            sort: index,
          },
        });
      }

      // Durasi yang dihapus dari sel ikut dilepas. Ruang lingkupnya hanya
      // parameter pada baris ini, jadi tidak bisa menyapu data lain.
      await prisma.regulationParameterDuration.deleteMany({
        where: {
          regulationParameterId: regulationParameter.id,
          durationId: { notIn: keptDurationIds.length ? keptDurationIds : [""] },
        },
      });
    }

    const total =
      summary.matrixCreated +
      summary.matrixUpdated +
      summary.regulationCreated +
      summary.regulationUpdated +
      summary.parameterCreated +
      summary.parameterUpdated;

    return NextResponse.json({
      message:
        total === 0
          ? "Tidak ada baris yang terbaca. Pastikan data diisi mulai baris kedua."
          : `Import selesai. Matriks ${summary.matrixCreated} baru / ${summary.matrixUpdated} diperbarui, regulasi ${summary.regulationCreated} baru / ${summary.regulationUpdated} diperbarui, parameter ${summary.parameterCreated} baru / ${summary.parameterUpdated} diperbarui.`,
      summary,
      errors,
    });
  } catch (error) {
    console.error("IMPORT_MARKETING_MASTER_ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat import master marketing",
        summary,
        errors,
      },
      { status: 500 }
    );
  }
}
