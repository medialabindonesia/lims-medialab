/**
 * Memasukkan katalog MENU PENGUJIAN ke database, dan membuang katalog lain.
 *
 * MENGAPA SCRIPT INI ADA
 * ----------------------
 * Sebelumnya katalog dimasukkan lewat unggah Excel manual di halaman master.
 * Akibatnya tiap environment berisi hal yang berbeda: database lokal punya
 * katalog baru DAN katalog lama sekaligus, sementara database marketing di
 * server hanya punya katalog lama. Orang yang membuat quotation melihat
 * matriks lama dengan sedikit regulasi dan mengira sistemnya rusak.
 *
 * Script ini membuat isi katalog sepenuhnya ditentukan oleh satu berkas:
 * `docs/generated/master-marketing-menu-2024.xlsx`. Apa pun yang ada di
 * database tetapi tidak ada di berkas itu dianggap katalog lama dan dibuang.
 *
 * AMAN DIJALANKAN BERULANG
 * ------------------------
 * Menjalankannya dua kali menghasilkan keadaan yang sama, tidak menggandakan
 * data. Kalau terputus di tengah, cukup jalankan lagi.
 *
 * QUOTATION LAMA TIDAK IKUT TERHAPUS
 * ----------------------------------
 * Quotation menyimpan salinan teksnya sendiri (nama matriks, metode, durasi)
 * pada saat dibuat, dan tautan ke master memakai `SetNull`. Jadi menghapus
 * katalog lama hanya memutus tautannya, tidak menghapus quotation maupun
 * mengubah dokumen yang sudah tercetak.
 *
 * Jalankan:
 *   pnpm db:sync:menu-pengujian --dry-run    # hanya menampilkan rencana
 *   pnpm db:sync:menu-pengujian              # menerapkan
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  parseDurations,
  regulationParameterVariantKey,
  SHEETS,
} from "../src/lib/marketing-master-workbook";
import { CANONICAL_DURATIONS, classifySamplingEntry } from "../src/lib/sampling-duration-catalog";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const workbookPath =
  args.find((value) => !value.startsWith("--")) ||
  path.join(process.cwd(), "docs/generated/master-marketing-menu-2024.xlsx");

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum ada di .env");

  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    connectionLimit: 10,
    connectTimeout: 20_000,
    acquireTimeout: 20_000,
  });
}

const prisma = new PrismaClient({ adapter: createAdapter() });

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value as { result?: unknown; richText?: Array<{ text: string }> } | unknown;

  if (value && typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("result" in value) return String(value.result ?? "").trim();
  }

  return String(value ?? "").trim();
}

function optional(value: string) {
  return value.trim() || null;
}

function yes(value: string) {
  return !/^(no|n|false|0|tidak)$/i.test(value.trim());
}

function readSheet(workbook: ExcelJS.Workbook, name: string) {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) throw new Error(`Sheet "${name}" tidak ada pada ${workbookPath}`);

  const header = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => header.set(cellText(cell), column));

  const rows: Array<Record<string, string>> = [];
  for (let rowNo = 2; rowNo <= sheet.rowCount; rowNo += 1) {
    const row = sheet.getRow(rowNo);
    const record: Record<string, string> = {};
    let filled = false;

    for (const [name_, column] of header) {
      const value = cellText(row.getCell(column));
      record[name_] = value;
      if (value) filled = true;
    }

    if (filled) rows.push(record);
  }

  return rows;
}

/** Memecah pekerjaan besar agar tidak melebihi batas paket koneksi database. */
async function inBatches<T>(items: T[], size: number, run: (chunk: T[]) => Promise<unknown>) {
  for (let index = 0; index < items.length; index += size) {
    await run(items.slice(index, index + size));
  }
}

async function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(
      `Berkas katalog tidak ditemukan: ${workbookPath}\n` +
        `Buat dulu dengan: pnpm convert:menu-pengujian`,
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const matrixRows = readSheet(workbook, SHEETS.matrices);
  const regulationRows = readSheet(workbook, SHEETS.regulations);
  const parameterRows = readSheet(workbook, SHEETS.parameters);

  console.log(`Katalog sumber : ${workbookPath}`);
  console.log(
    `Isi berkas     : ${matrixRows.length} matriks, ${regulationRows.length} regulasi, ${parameterRows.length} parameter`,
  );

  const wantedMatrixCodes = new Set(matrixRows.map((row) => row.code));
  const wantedRegulationCodes = new Set(regulationRows.map((row) => row.code));

  // ---------------------------------------------------------------- rencana
  const existingMatrices = await prisma.matrix.findMany({ select: { id: true, code: true, parentId: true } });
  const existingRegulations = await prisma.regulation.findMany({ select: { id: true, code: true } });

  const staleMatrices = existingMatrices.filter((item) => !wantedMatrixCodes.has(item.code));
  const staleRegulations = existingRegulations.filter((item) => !wantedRegulationCodes.has(item.code));
  const staleRegulationIds = staleRegulations.map((item) => item.id);
  const staleMatrixIds = staleMatrices.map((item) => item.id);

  const [blockedGroupLinks, affectedGroupsByMatrix, affectedItems] = await Promise.all([
    prisma.quotationGroupRegulation.count({ where: { regulationId: { in: staleRegulationIds } } }),
    prisma.quotationGroup.count({ where: { matrixId: { in: staleMatrixIds } } }),
    prisma.quotationItem.count({
      where: { regulationParameter: { regulationId: { in: staleRegulationIds } } },
    }),
  ]);

  console.log("\nRencana pembersihan katalog lama:");
  console.log(`  Matriks dihapus                     : ${staleMatrices.length}`);
  console.log(`  Regulasi dihapus                    : ${staleRegulations.length}`);
  console.log(`  Tautan regulasi pada quotation      : ${blockedGroupLinks} (tautan diputus, quotation tetap ada)`);
  console.log(`  Grup quotation kehilangan tautan    : ${affectedGroupsByMatrix} (matriks jadi kosong, teksnya tetap)`);
  console.log(`  Baris parameter quotation terdampak : ${affectedItems} (tautan master diputus, teksnya tetap)`);

  if (dryRun) {
    console.log("\n--dry-run: tidak ada perubahan yang ditulis.");
    return;
  }

  // -------------------------------------------------------------- hapus lama
  if (staleRegulationIds.length > 0) {
    // `QuotationGroupRegulation` memakai Restrict, jadi harus dilepas duluan.
    await inBatches(staleRegulationIds, 200, (chunk) =>
      prisma.quotationGroupRegulation.deleteMany({ where: { regulationId: { in: chunk } } }),
    );
    // Menghapus regulasi ikut menghapus parameter dan durasinya (Cascade).
    await inBatches(staleRegulationIds, 200, (chunk) =>
      prisma.regulation.deleteMany({ where: { id: { in: chunk } } }),
    );
  }

  if (staleMatrixIds.length > 0) {
    // Induk memakai Restrict, jadi anak harus dihapus lebih dulu. Diulang
    // sampai tidak ada lagi yang bisa dihapus agar kedalaman pohon bebas.
    const remaining = new Map(staleMatrices.map((item) => [item.id, item]));
    while (remaining.size > 0) {
      const parentIds = new Set(
        [...remaining.values()].map((item) => item.parentId).filter((value): value is string => Boolean(value)),
      );
      const leaves = [...remaining.values()].filter((item) => !parentIds.has(item.id));
      if (leaves.length === 0) break;

      await inBatches(leaves.map((item) => item.id), 200, (chunk) =>
        prisma.matrix.deleteMany({ where: { id: { in: chunk } } }),
      );
      leaves.forEach((item) => remaining.delete(item.id));
    }
  }

  // ------------------------------------------------------------------ durasi
  for (const duration of CANONICAL_DURATIONS) {
    await prisma.samplingDuration.upsert({
      where: { code: duration.code },
      create: { code: duration.code, label: duration.label, minutes: duration.minutes, sort: duration.sort, isActive: true },
      update: { label: duration.label, minutes: duration.minutes, sort: duration.sort, isActive: true },
    });
  }

  // Dicocokkan berdasarkan KODE, bukan label.
  //
  // Database lama berisi beberapa baris berlabel sama persis dengan kode
  // berbeda — "Grab (Sesaat)" ada sebagai `GRAB` sekaligus `GRAB_SESAAT`,
  // "1 Jam" sebagai `H1` sekaligus `1_JAM`. Mencocokkan lewat label membuat
  // tautan menempel ke baris lama secara acak, sehingga baris lama itu tidak
  // pernah bisa dibersihkan.
  const durationByCode = new Map(
    (await prisma.samplingDuration.findMany({ select: { id: true, code: true } })).map(
      (item) => [item.code, item],
    ),
  );

  // ----------------------------------------------------------------- matriks
  // Berkas sudah berurut induk lalu anak, tetapi urutannya diperiksa ulang
  // supaya berkas hasil suntingan manual tetap bisa dipakai.
  const pendingMatrices = [...matrixRows];
  const matrixIdByCode = new Map(
    (await prisma.matrix.findMany({ select: { id: true, code: true } })).map((item) => [item.code, item.id]),
  );

  let guard = pendingMatrices.length + 1;
  while (pendingMatrices.length > 0 && guard > 0) {
    guard -= 1;
    const ready = pendingMatrices.filter((row) => !row.parentCode || matrixIdByCode.has(row.parentCode));
    if (ready.length === 0) {
      throw new Error(
        `Matriks berikut menunjuk induk yang tidak ada: ${pendingMatrices.map((row) => row.code).join(", ")}`,
      );
    }

    for (const row of ready) {
      const record = await prisma.matrix.upsert({
        where: { code: row.code },
        create: {
          code: row.code,
          name: row.name,
          parentId: row.parentCode ? matrixIdByCode.get(row.parentCode)! : null,
          note: optional(row.note),
          sort: Number(row.sort) || 0,
          isActive: yes(row.isActive),
        },
        update: {
          name: row.name,
          parentId: row.parentCode ? matrixIdByCode.get(row.parentCode)! : null,
          note: optional(row.note),
          sort: Number(row.sort) || 0,
          isActive: yes(row.isActive),
        },
      });
      matrixIdByCode.set(record.code, record.id);
      pendingMatrices.splice(pendingMatrices.indexOf(row), 1);
    }
  }

  // ---------------------------------------------------------------- regulasi
  for (const row of regulationRows) {
    const matrixId = matrixIdByCode.get(row.matrixCode);
    if (!matrixId) throw new Error(`Regulasi ${row.code} menunjuk matriks ${row.matrixCode} yang tidak ada`);

    await prisma.regulation.upsert({
      where: { code: row.code },
      create: {
        code: row.code, name: row.name, shortName: optional(row.shortName), matrixId,
        note: optional(row.note), sort: Number(row.sort) || 0, isActive: yes(row.isActive),
      },
      update: {
        name: row.name, shortName: optional(row.shortName), matrixId,
        note: optional(row.note), sort: Number(row.sort) || 0, isActive: yes(row.isActive),
      },
    });
  }

  const regulationIdByCode = new Map(
    (await prisma.regulation.findMany({ select: { id: true, code: true } })).map((item) => [item.code, item.id]),
  );

  // ------------------------------------------------------ parameter analisis
  // Dipakai bersama modul lain (sample, CoA), jadi hanya ditambah bila belum
  // ada — tidak pernah dihapus oleh script ini.
  const parameterNames = [...new Set(parameterRows.map((row) => row.parameterName).filter(Boolean))];
  const existingAnalysis = new Map(
    (await prisma.analysisParameter.findMany({ select: { id: true, name: true } })).map(
      (item) => [item.name.toLowerCase(), item.id],
    ),
  );
  const missingAnalysis = parameterNames.filter((name) => !existingAnalysis.has(name.toLowerCase()));

  await inBatches(missingAnalysis, 500, async (chunk) => {
    await prisma.analysisParameter.createMany({
      data: chunk.map((name) => ({ name, price: 0, isActive: true })),
    });
  });

  if (missingAnalysis.length > 0) {
    for (const item of await prisma.analysisParameter.findMany({ select: { id: true, name: true } })) {
      existingAnalysis.set(item.name.toLowerCase(), item.id);
    }
  }

  // -------------------------------------------------- parameter per regulasi
  let parameterCreated = 0;
  let parameterUpdated = 0;
  const durationLinks: Array<{ regulationParameterId: string; durationId: string; limitValue: string | null; isDefault: boolean; sort: number }> = [];
  const keptParameterIds = new Set<string>();

  for (const row of parameterRows) {
    const regulationId = regulationIdByCode.get(row.regulationCode);
    if (!regulationId) throw new Error(`Parameter ${row.parameterName} menunjuk regulasi ${row.regulationCode} yang tidak ada`);

    const parameterId = existingAnalysis.get(row.parameterName.toLowerCase());
    if (!parameterId) throw new Error(`Parameter analisis ${row.parameterName} gagal dibuat`);

    const variantKey = regulationParameterVariantKey(row.method, row.unit);

    const payload = {
      displayName: optional(row.displayName),
      unit: optional(row.unit),
      method: optional(row.method),
      limitValue: optional(row.limitValue),
      limitValue2: optional(row.limitValue2),
      samplingMethod: optional(row.samplingMethod),
      sampleMatrix: optional(row.sampleMatrix),
      sampleSize: optional(row.sampleSize),
      isAccredited: yes(row.isAccredited),
      defaultSelected: yes(row.defaultSelected),
      sort: Number(row.sort) || 0,
      isActive: yes(row.isActive),
    };

    const existing = await prisma.regulationParameter.findUnique({
      where: {
        regulationId_parameterId_variantKey: { regulationId, parameterId, variantKey },
      },
      select: { id: true },
    });

    const record = existing
      ? await prisma.regulationParameter.update({ where: { id: existing.id }, data: payload })
      : await prisma.regulationParameter.create({
          data: { regulationId, parameterId, variantKey, ...payload },
        });

    if (existing) parameterUpdated += 1;
    else parameterCreated += 1;
    keptParameterIds.add(record.id);

    parseDurations(row.durations).forEach((entry, index) => {
      // Berkas hasil converter sudah bersih, tetapi berkas suntingan manual
      // bisa saja memasukkan metode sampling ke kolom durasi lagi. Saringan
      // ini yang menjaga master durasi tetap berisi durasi saja.
      const classified = classifySamplingEntry(entry.label);
      if (classified.kind !== "duration") return;

      const duration = durationByCode.get(classified.duration.code);
      if (!duration) return;

      durationLinks.push({
        regulationParameterId: record.id,
        durationId: duration.id,
        limitValue: entry.limitValue,
        isDefault: entry.isDefault,
        sort: index * 10,
      });
    });
  }

  // Parameter usang di dalam regulasi yang tetap dipakai.
  //
  // Menghapus regulasi memang ikut menghapus parameternya, tetapi baris yang
  // dibuang dari berkas sementara regulasinya tetap ada tidak tersentuh oleh
  // langkah itu. Tanpa pembersihan ini isi database hanya bertambah dan tidak
  // pernah benar-benar sama dengan berkas sumber.
  const survivingRegulationIds = regulationRows
    .map((row) => regulationIdByCode.get(row.code))
    .filter((value): value is string => Boolean(value));

  const staleParameterIds: string[] = [];
  await inBatches(survivingRegulationIds, 200, async (chunk) => {
    const found = await prisma.regulationParameter.findMany({
      where: { regulationId: { in: chunk } },
      select: { id: true },
    });
    found.forEach((item) => {
      if (!keptParameterIds.has(item.id)) staleParameterIds.push(item.id);
    });
  });

  // Durasinya ikut terhapus (Cascade); tautan pada quotation dan survey
  // memakai SetNull sehingga dokumen lama tetap utuh.
  await inBatches(staleParameterIds, 500, (chunk) =>
    prisma.regulationParameter.deleteMany({ where: { id: { in: chunk } } }),
  );

  // Ditulis ulang seluruhnya agar durasi yang dihapus dari berkas ikut hilang.
  const touchedParameterIds = [...new Set(durationLinks.map((item) => item.regulationParameterId))];
  await inBatches(touchedParameterIds, 500, (chunk) =>
    prisma.regulationParameterDuration.deleteMany({ where: { regulationParameterId: { in: chunk } } }),
  );
  await inBatches(durationLinks, 500, (chunk) =>
    prisma.regulationParameterDuration.createMany({ data: chunk, skipDuplicates: true }),
  );

  // ------------------------------------------------- sisa durasi tidak lazim
  const canonicalCodes = new Set(CANONICAL_DURATIONS.map((item) => item.code));
  const orphanDurations = (
    await prisma.samplingDuration.findMany({
      where: { code: { notIn: [...canonicalCodes] } },
      select: { id: true, code: true, _count: { select: { regulationParameters: true } } },
    })
  ).filter((item) => item._count.regulationParameters === 0);

  if (orphanDurations.length > 0) {
    await prisma.samplingDuration.deleteMany({ where: { id: { in: orphanDurations.map((item) => item.id) } } });
  }

  // ------------------------------------------------------------------ laporan
  const [matrixTotal, regulationTotal, regulationParameterTotal, durationTotal] = await Promise.all([
    prisma.matrix.count(),
    prisma.regulation.count(),
    prisma.regulationParameter.count(),
    prisma.samplingDuration.count(),
  ]);

  console.log("\nSelesai.");
  console.log(`  Matriks lama dihapus     : ${staleMatrices.length}`);
  console.log(`  Regulasi lama dihapus    : ${staleRegulations.length}`);
  console.log(`  Durasi sisa dibersihkan  : ${orphanDurations.length} (${orphanDurations.map((item) => item.code).join(", ") || "-"})`);
  console.log(`  Parameter baru dibuat    : ${parameterCreated}`);
  console.log(`  Parameter diperbarui     : ${parameterUpdated}`);
  console.log(`  Parameter usang dihapus  : ${staleParameterIds.length}`);
  console.log("\nIsi katalog sekarang:");
  console.log(`  Matriks              : ${matrixTotal}`);
  console.log(`  Regulasi             : ${regulationTotal}`);
  console.log(`  Parameter per regulasi: ${regulationParameterTotal}`);
  console.log(`  Durasi sampling      : ${durationTotal}`);
}

main()
  .catch((error) => {
    console.error("Sync katalog gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
