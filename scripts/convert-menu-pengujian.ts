/**
 * Mengubah `MENU PENGUJIAN 2024.xlsx` milik Marketing menjadi berkas master
 * yang siap dimasukkan ke sistem.
 *
 * Menurut Marketing, menu pengujian adalah SELURUH layanan yang Medialab bisa
 * tawarkan. Karena itu berkas inilah satu-satunya sumber matriks, regulasi,
 * dan parameter pada form quotation — tidak ada katalog lain yang boleh hidup
 * berdampingan dengannya.
 *
 * Jalankan:
 *   pnpm convert:menu-pengujian ["path sumber.xlsx"] ["path keluaran.xlsx"]
 *
 * Keluarannya dibaca oleh `scripts/sync-menu-pengujian.ts` untuk dimasukkan ke
 * database, dan ikut disimpan di repo agar server tidak perlu memegang berkas
 * asli milik Marketing.
 */

import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  buildMarketingMasterWorkbook,
  type MarketingMasterExport,
  type ParsedDuration,
} from "../src/lib/marketing-master-workbook";
import { normalizeCode } from "../src/lib/excel-import";
import { classifySamplingEntry } from "../src/lib/sampling-duration-catalog";

const SOURCE_SHEETS = ["Database", "Database UE", "Parameter Lainnya"] as const;
const source = process.argv[2] || "C:/Users/UseR/Documents/MENU PENGUJIAN 2024.xlsx";
const output =
  process.argv[3] ||
  path.join(process.cwd(), "docs/generated/master-marketing-menu-2024.xlsx");

function text(cell: ExcelJS.Cell) {
  const value = cell.value as { result?: unknown; richText?: Array<{ text: string }> } | unknown;

  if (value && typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("result" in value) return String(value.result ?? "").trim();
  }

  return String(value ?? "").trim();
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Kunci pembanding yang mengabaikan beda huruf besar/kecil dan spasi ganda.
 *
 * Ini yang membuat "Solid Quality Analysis" dan "Solid quality Analysis" —
 * dua baris yang pada konversi terdahulu menjadi dua cabang terpisah di form
 * quotation — dikenali sebagai satu hal yang sama.
 */
function key(...parts: string[]) {
  return parts.map((part) => clean(part).toLocaleLowerCase("id-ID")).join("\u241f");
}

/** Membuang tanda akreditasi di akhir nama parameter. */
function stripAsterisk(value: string) {
  return clean(value.replace(/\s*\*+\s*$/, ""));
}

function hasAsterisk(value: string) {
  return /\*\s*$/.test(value.trim());
}

/**
 * Kode yang bisa dibaca manusia dan tetap dijamin unik.
 *
 * Konversi terdahulu menempelkan potongan hash SHA-1 pada setiap kode sehingga
 * form quotation menampilkan hal seperti
 * `MTX_SURFACE_WATER_QUALITY_ANALYSIS_WELL_WATER_LAKE_W_9E1AD98`.
 * Di sini angka pembeda hanya ditambahkan kalau memang terjadi tabrakan, jadi
 * kode yang lazim tetap pendek dan terbaca.
 */
function makeCodeFactory() {
  const used = new Set<string>();

  return function makeCode(parentCode: string | null, label: string, maxLength: number) {
    const base = normalizeCode(label).slice(0, maxLength) || "ITEM";
    const prefix = parentCode ? `${parentCode}.` : "";

    let candidate = `${prefix}${base}`;
    let counter = 2;
    while (used.has(candidate)) {
      candidate = `${prefix}${base}_${counter}`;
      counter += 1;
    }

    used.add(candidate);
    return candidate;
  };
}

type SourceRow = {
  sheet: string;
  row: number;
  subject: string;
  matrix: string;
  regulationQuotation: string;
  regulationCoa: string;
  parameter: string;
  method: string;
  samplingMethod: string;
  sampleMatrix: string;
  limit1: string;
  limit2: string;
  unit: string;
  paraQuot: string;
  sampleSize: string;
  /// Hanya ada pada sheet `Database UE`; kosong pada sheet lain.
  accreditationStatus: string;
  analysisStatus: string;
};

type ReviewRow = [string, string, number, string, string, string, string];

async function main() {
  if (!fs.existsSync(source)) throw new Error(`Workbook tidak ditemukan: ${source}`);

  const sourceBook = new ExcelJS.Workbook();
  await sourceBook.xlsx.readFile(source);
  const rows: SourceRow[] = [];

  for (const sheetName of SOURCE_SHEETS) {
    const sheet = sourceBook.getWorksheet(sheetName);
    if (!sheet) continue;

    const header = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, column) => header.set(clean(text(cell)).toUpperCase(), column));
    const get = (row: ExcelJS.Row, name: string) => text(row.getCell(header.get(name) || 16384));

    for (let rowNo = 2; rowNo <= sheet.rowCount; rowNo += 1) {
      const row = sheet.getRow(rowNo);
      const subject = get(row, "SUBJECT");
      const matrix = get(row, "MATRIX");
      const parameter = get(row, "PARAMETER");
      if (!subject && !matrix && !parameter) continue;

      rows.push({
        sheet: sheetName,
        row: rowNo,
        subject,
        matrix,
        regulationQuotation: get(row, "REGULATION IN QUOTATION"),
        regulationCoa: get(row, "REGULATION IN COA"),
        parameter,
        method: get(row, "TESTING METHOD"),
        samplingMethod: get(row, "SAMPLING METHOD"),
        sampleMatrix: get(row, "SAMPLE MATRIX"),
        limit1: get(row, "LIMIT1"),
        limit2: get(row, "LIMIT2"),
        unit: get(row, "UNIT"),
        paraQuot: get(row, "PARA QUOT"),
        sampleSize: get(row, "SAMPLE SIZE"),
        accreditationStatus: get(row, "STATUS AKREDITASI"),
        analysisStatus: get(row, "STATUS ANALISA"),
      });
    }
  }

  const incomplete = rows.filter((row) => !row.subject || !row.matrix || !row.parameter);
  const valid = rows.filter((row) => row.subject && row.matrix && row.parameter);

  const exactSeen = new Set<string>();
  const duplicates: SourceRow[] = [];
  const uniqueRows = valid.filter((row) => {
    const businessKey = key(
      row.subject, row.matrix, row.regulationQuotation, row.regulationCoa,
      row.parameter, row.method, row.samplingMethod, row.sampleMatrix,
      row.limit1, row.limit2, row.unit, row.sampleSize,
    );
    if (exactSeen.has(businessKey)) {
      duplicates.push(row);
      return false;
    }
    exactSeen.add(businessKey);
    return true;
  });

  const makeCode = makeCodeFactory();
  const matrices: MarketingMasterExport["matrices"] = [];
  const matrixCodes = new Map<string, string>();

  // Ejaan yang pertama kali muncul dipakai sebagai bentuk baku. Ejaan lain
  // yang hanya berbeda huruf besar/kecil menempel ke simpul yang sama.
  const mergedSpellings: ReviewRow[] = [];

  for (const row of uniqueRows) {
    const subjectKey = key(row.subject);
    if (!matrixCodes.has(subjectKey)) {
      const code = makeCode(null, clean(row.subject), 44);
      matrixCodes.set(subjectKey, code);
      matrices.push({
        code,
        name: clean(row.subject),
        parentCode: null,
        note: "Sumber: MENU PENGUJIAN 2024.xlsx",
        sort: matrices.length * 10 + 10,
        isActive: true,
      });
    } else {
      const canonical = matrices.find((item) => item.code === matrixCodes.get(subjectKey));
      if (canonical && canonical.name !== clean(row.subject)) {
        mergedSpellings.push([
          "EJAAN_DIGABUNG", row.sheet, row.row, clean(row.subject),
          "", canonical.name, "Subject digabung karena hanya beda huruf besar/kecil",
        ]);
      }
    }
  }

  for (const row of uniqueRows) {
    const pairKey = key(row.subject, row.matrix);
    if (matrixCodes.has(pairKey)) {
      const canonical = matrices.find((item) => item.code === matrixCodes.get(pairKey));
      if (canonical && canonical.name !== clean(row.matrix)) {
        mergedSpellings.push([
          "EJAAN_DIGABUNG", row.sheet, row.row, clean(row.subject),
          clean(row.matrix), canonical.name, "Matriks digabung karena hanya beda huruf besar/kecil",
        ]);
      }
      continue;
    }

    const parentCode = matrixCodes.get(key(row.subject))!;
    const code = makeCode(parentCode, clean(row.matrix), 44);
    matrixCodes.set(pairKey, code);
    matrices.push({
      code,
      name: clean(row.matrix),
      parentCode,
      note: `Subject: ${clean(row.subject)}`,
      sort: matrices.length * 10 + 10,
      isActive: true,
    });
  }

  const regulationCodes = new Map<string, string>();
  const regulations: MarketingMasterExport["regulations"] = [];

  for (const row of uniqueRows) {
    const regulationKey = key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa);
    if (regulationCodes.has(regulationKey)) continue;

    const fullName = clean(row.regulationCoa || row.regulationQuotation || "Tanpa regulasi / parameter lainnya");
    const shortName = clean(row.regulationQuotation || row.regulationCoa || "Parameter lainnya");
    const matrixCode = matrixCodes.get(key(row.subject, row.matrix))!;
    const code = makeCode(matrixCode, shortName, 70);

    regulationCodes.set(regulationKey, code);
    regulations.push({
      code,
      name: fullName,
      shortName,
      matrixCode,
      note: `Sumber ${row.sheet}`,
      sort: regulations.length * 10 + 10,
      isActive: true,
    });
  }

  // Satu parameter bisa muncul berulang untuk durasi berbeda. Baris dengan
  // metode uji dan satuan yang sama digabung menjadi satu relasi berdurasi
  // banyak; metode uji berbeda tetap menjadi varian terpisah.
  const parameterGroups = new Map<string, SourceRow[]>();
  for (const row of uniqueRows) {
    const regulationCode = regulationCodes.get(
      key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa),
    )!;
    const groupKey = key(regulationCode, stripAsterisk(row.parameter), row.method, row.unit);
    parameterGroups.set(groupKey, [...(parameterGroups.get(groupKey) || []), row]);
  }

  const accreditationReview: ReviewRow[] = [];
  const subcontractedRows: ReviewRow[] = [];
  const unknownDurations = new Map<string, number>();

  const parameters: MarketingMasterExport["parameters"] = [...parameterGroups.values()].map(
    (group, index) => {
      const row = group[0];
      const parameterName = stripAsterisk(row.parameter);
      const distinct = (values: string[]) => [...new Set(values.map(clean).filter(Boolean))];

      // Pemisahan durasi dan metode sampling. Inilah yang mencegah
      // "Isokinetik (APEX)" dan "SNI 8990:2021" masuk ke master durasi.
      const durationMap = new Map<string, ParsedDuration>();
      const methodLabels: string[] = [];

      for (const item of group) {
        const classified = classifySamplingEntry(item.samplingMethod);
        if (classified.kind === "empty") continue;

        if (classified.kind === "method") {
          methodLabels.push(classified.label);
          continue;
        }

        const { duration } = classified;
        if (duration.sort === 900) {
          unknownDurations.set(
            duration.label,
            (unknownDurations.get(duration.label) || 0) + 1,
          );
        }
        if (!durationMap.has(duration.code)) {
          durationMap.set(duration.code, {
            label: duration.label,
            limitValue: clean(item.limit1 || item.limit2) || null,
            isDefault: durationMap.size === 0,
          });
        }
      }

      const durations = [...durationMap.values()];

      // Status akreditasi. Kolom `Status Akreditasi` pada sheet `Database UE`
      // dinyatakan tertulis, jadi ia mengalahkan tebakan dari tanda bintang.
      const explicit = distinct(group.map((item) => item.accreditationStatus));
      const asteriskOnParameter = group.some((item) => hasAsterisk(item.parameter));
      const asteriskOnQuotation = group.some((item) => hasAsterisk(item.paraQuot));

      let isAccredited: boolean;
      if (explicit.length > 0) {
        isAccredited = explicit.every((value) => /^terakreditasi$/i.test(value));
      } else {
        // Ambigu (bintang hanya di salah satu kolom) diperlakukan sebagai
        // BELUM terakreditasi. Mencetak bintang berlebih hanya membuat
        // Medialab terlihat merendah; menghilangkannya tanpa dasar berarti
        // mengklaim akreditasi kepada customer.
        isAccredited = !asteriskOnParameter && !asteriskOnQuotation;

        if (asteriskOnParameter !== asteriskOnQuotation) {
          accreditationReview.push([
            "AKREDITASI_TIDAK_KONSISTEN",
            row.sheet,
            row.row,
            clean(row.subject),
            clean(row.matrix),
            `${clean(row.parameter)}  <>  ${clean(row.paraQuot)}`,
            "Ditandai BELUM terakreditasi sampai dikonfirmasi Marketing/Teknis",
          ]);
        }
      }

      const subcontracted = distinct(group.map((item) => item.analysisStatus));
      if (subcontracted.length > 0) {
        subcontractedRows.push([
          "STATUS_ANALISA", row.sheet, row.row, clean(row.subject), clean(row.matrix),
          `${parameterName}: ${subcontracted.join(" | ")}`,
          "Dikerjakan di luar Medialab; pastikan harga dan TAT sudah memperhitungkannya",
        ]);
      }

      return {
        regulationCode: regulationCodes.get(
          key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa),
        )!,
        parameterName,
        displayName: stripAsterisk(row.paraQuot) || parameterName,
        unit: clean(row.unit) || null,
        method: clean(row.method) || null,
        limitValue: distinct(group.map((item) => item.limit1)).join(" | ") || null,
        limitValue2: distinct(group.map((item) => item.limit2)).join(" | ") || null,
        samplingMethod: distinct(methodLabels).join(" | ") || null,
        sampleMatrix: distinct(group.map((item) => item.sampleMatrix)).join(" | ") || null,
        sampleSize: distinct(group.map((item) => item.sampleSize)).join(" | ") || null,
        basePrice: null,
        durations,
        isAccredited,
        defaultSelected: true,
        sort: (index + 1) * 10,
        isActive: true,
      };
    },
  );

  const result = buildMarketingMasterWorkbook({ matrices, regulations, parameters });

  const audit = result.addWorksheet("Audit Sumber");
  audit.addRow(["Metric", "Jumlah"]);
  audit.getRow(1).font = { bold: true };
  ([
    ["Baris sumber", rows.length],
    ["Baris valid", valid.length],
    ["Duplikat persis yang dilewati", duplicates.length],
    ["Baris tidak lengkap yang disisihkan", incomplete.length],
    ["Ejaan digabung (beda huruf besar/kecil)", mergedSpellings.length],
    ["Parameter perlu review akreditasi", accreditationReview.length],
    ["Matriks termasuk subject", matrices.length],
    ["Regulasi", regulations.length],
    ["Parameter-relasi", parameters.length],
    ["Durasi di luar daftar baku", unknownDurations.size],
    ["Parameter dengan status analisa khusus", subcontractedRows.length],
  ] as Array<[string, number]>).forEach((entry) => audit.addRow(entry));

  audit.addRow([]);
  audit.addRow(["Jenis", "Sheet", "Baris", "Subject", "Matrix", "Keterangan", "Tindakan"]);
  audit.getRow(audit.rowCount).font = { bold: true };
  incomplete.forEach((row) =>
    audit.addRow([
      "DATA_TIDAK_LENGKAP", row.sheet, row.row, row.subject, row.matrix,
      row.parameter, "Tidak dimasukkan; kolom wajib kosong",
    ]),
  );
  mergedSpellings.forEach((row) => audit.addRow(row));
  subcontractedRows.forEach((row) => audit.addRow(row));
  [...unknownDurations.entries()].forEach(([label, count]) =>
    audit.addRow([
      "DURASI_BARU", "-", 0, "", "", `${label} (${count} baris)`,
      "Durasi sah tetapi belum terdaftar pada daftar baku",
    ]),
  );
  audit.columns = [{ width: 26 }, { width: 18 }, { width: 8 }, { width: 32 }, { width: 34 }, { width: 60 }, { width: 52 }];

  // Sheet terpisah supaya Marketing tidak perlu menyaring sendiri.
  const review = result.addWorksheet("Review Akreditasi");
  review.addRow(["Jenis", "Sheet", "Baris", "Subject", "Matrix", "Perbedaan penulisan", "Tindakan sementara"]);
  review.getRow(1).font = { bold: true };
  accreditationReview.forEach((row) => review.addRow(row));
  review.columns = [{ width: 26 }, { width: 18 }, { width: 8 }, { width: 32 }, { width: 34 }, { width: 64 }, { width: 56 }];
  review.views = [{ state: "frozen", ySplit: 1 }];

  fs.mkdirSync(path.dirname(output), { recursive: true });
  await result.xlsx.writeFile(output);

  console.log(
    JSON.stringify(
      {
        source,
        output,
        sourceRows: rows.length,
        validRows: valid.length,
        duplicates: duplicates.length,
        incomplete: incomplete.length,
        mergedSpellings: mergedSpellings.length,
        accreditationReview: accreditationReview.length,
        matrices: matrices.length,
        regulations: regulations.length,
        parameters: parameters.length,
        unknownDurations: [...unknownDurations.keys()],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
