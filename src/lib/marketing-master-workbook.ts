import ExcelJS from "exceljs";

/**
 * Format workbook master marketing: matriks, regulasi, dan parameter uji
 * beserta harga dasarnya.
 *
 * Berkas ini dipakai dua arah oleh endpoint export dan import, sehingga nama
 * kolomnya didefinisikan sekali di sini agar keduanya tidak pernah berbeda.
 *
 * Filosofinya: file yang diunduh SUDAH BERISI data yang ada sekarang, bukan
 * form kosong. Orang sales tinggal mengoreksi dan menambah baris, lalu
 * mengunggahnya kembali — jauh lebih mungkin dikerjakan daripada diminta
 * mengisi template kosong dari nol.
 */

export const SHEETS = {
  instructions: "Petunjuk",
  matrices: "Matriks",
  regulations: "Regulasi",
  parameters: "Parameter",
} as const;

export const MATRIX_COLUMNS = [
  "code",
  "name",
  "parentCode",
  "note",
  "sort",
  "isActive",
] as const;

export const REGULATION_COLUMNS = [
  "code",
  "name",
  "shortName",
  "matrixCode",
  "note",
  "sort",
  "isActive",
] as const;

export const PARAMETER_COLUMNS = [
  "regulationCode",
  "parameterName",
  "displayName",
  "unit",
  "method",
  "limitValue",
  "basePrice",
  "durations",
  "isAccredited",
  "defaultSelected",
  "sort",
  "isActive",
] as const;

/**
 * Sintaks kolom `durations`.
 *
 *   *1 Jam=150 µg/m³ | 24 Jam=75 µg/m³ | 1 Tahun=45 µg/m³
 *
 * Dipisah tanda `|`. Bagian setelah `=` adalah baku mutu untuk durasi itu dan
 * boleh dikosongkan. Tanda `*` di depan menandai durasi default yang terpilih
 * otomatis di form quotation.
 */
export type ParsedDuration = {
  label: string;
  limitValue: string | null;
  isDefault: boolean;
};

export function parseDurations(raw: string | null): ParsedDuration[] {
  if (!raw) return [];

  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const isDefault = part.startsWith("*");
      const body = isDefault ? part.slice(1).trim() : part;

      const separator = body.indexOf("=");
      const label = (separator >= 0 ? body.slice(0, separator) : body).trim();
      const limitValue =
        separator >= 0 ? body.slice(separator + 1).trim() || null : null;

      return { label, limitValue, isDefault };
    })
    .filter((entry) => entry.label.length > 0);
}

export function formatDurations(entries: ParsedDuration[]) {
  return entries
    .map((entry) => {
      const prefix = entry.isDefault ? "*" : "";
      const suffix = entry.limitValue ? `=${entry.limitValue}` : "";
      return `${prefix}${entry.label}${suffix}`;
    })
    .join(" | ");
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F3D77" },
};

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: readonly string[],
  rows: Array<Array<string | number | null>>,
  widths: number[]
) {
  const sheet = workbook.addWorksheet(name);

  sheet.columns = columns.map((key, index) => ({
    header: key,
    key,
    width: widths[index] ?? 20,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = HEADER_FILL;
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;

  for (const row of rows) {
    sheet.addRow(row);
  }

  // Baris header tetap terlihat saat digulir — daftar parameter bisa panjang.
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return sheet;
}

export type MarketingMasterExport = {
  matrices: Array<{
    code: string;
    name: string;
    parentCode: string | null;
    note: string | null;
    sort: number;
    isActive: boolean;
  }>;
  regulations: Array<{
    code: string;
    name: string;
    shortName: string | null;
    matrixCode: string;
    note: string | null;
    sort: number;
    isActive: boolean;
  }>;
  parameters: Array<{
    regulationCode: string;
    parameterName: string;
    displayName: string | null;
    unit: string | null;
    method: string | null;
    limitValue: string | null;
    basePrice: number | null;
    durations: ParsedDuration[];
    isAccredited: boolean;
    defaultSelected: boolean;
    sort: number;
    isActive: boolean;
  }>;
};

const INSTRUCTIONS: Array<[string, string]> = [
  ["Cara pakai", "Ubah isi sel yang perlu dikoreksi, tambahkan baris baru di bawah, lalu unggah kembali berkas ini."],
  ["Aman diulang", "Baris dicocokkan berdasarkan kolom kode. Mengunggah berkas yang sama dua kali tidak menggandakan data."],
  ["Tidak menghapus", "Menghapus baris di Excel TIDAK menghapus datanya di sistem. Untuk menonaktifkan, isi kolom isActive dengan NO."],
  ["", ""],
  ["Sheet Matriks", "Jenis contoh uji, boleh bertingkat. Isi parentCode dengan code induknya; kosongkan untuk tingkat teratas."],
  ["Sheet Regulasi", "Baku mutu acuan. Kolom matrixCode harus cocok dengan salah satu code di sheet Matriks."],
  ["Sheet Parameter", "Parameter uji per regulasi. Kolom regulationCode harus cocok dengan code di sheet Regulasi."],
  ["", ""],
  ["Kolom basePrice", "Harga dasar per parameter. BOLEH DIKOSONGKAN — kosong berarti 'belum ditetapkan', berbeda dari angka 0."],
  ["Kolom durations", "Format:  *1 Jam=150 µg/m³ | 24 Jam=75 µg/m³ | 1 Tahun=45 µg/m³"],
  ["", "Dipisah tanda | . Bagian setelah = adalah baku mutu untuk durasi tersebut dan boleh dikosongkan."],
  ["", "Tanda * di depan menandai durasi yang terpilih otomatis di form quotation."],
  ["Kolom isAccredited", "NO untuk parameter tidak terakreditasi; akan dicetak dengan tanda * pada surat penawaran."],
  ["Kolom defaultSelected", "YES berarti parameter ikut tercentang otomatis saat regulasinya dipilih."],
];

export function buildMarketingMasterWorkbook(data: MarketingMasterExport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS Medialab";
  workbook.created = new Date();

  const guide = workbook.addWorksheet(SHEETS.instructions);
  guide.columns = [
    { header: "Bagian", key: "section", width: 24 },
    { header: "Keterangan", key: "detail", width: 110 },
  ];

  const guideHeader = guide.getRow(1);
  guideHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  guideHeader.fill = HEADER_FILL;
  guideHeader.height = 22;

  for (const [section, detail] of INSTRUCTIONS) {
    const row = guide.addRow([section, detail]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }

  addSheet(
    workbook,
    SHEETS.matrices,
    MATRIX_COLUMNS,
    data.matrices.map((item) => [
      item.code,
      item.name,
      item.parentCode,
      item.note,
      item.sort,
      item.isActive ? "YES" : "NO",
    ]),
    [28, 34, 28, 46, 8, 10]
  );

  addSheet(
    workbook,
    SHEETS.regulations,
    REGULATION_COLUMNS,
    data.regulations.map((item) => [
      item.code,
      item.name,
      item.shortName,
      item.matrixCode,
      item.note,
      item.sort,
      item.isActive ? "YES" : "NO",
    ]),
    [30, 52, 30, 28, 46, 8, 10]
  );

  addSheet(
    workbook,
    SHEETS.parameters,
    PARAMETER_COLUMNS,
    data.parameters.map((item) => [
      item.regulationCode,
      item.parameterName,
      item.displayName,
      item.unit,
      item.method,
      item.limitValue,
      item.basePrice,
      formatDurations(item.durations),
      item.isAccredited ? "YES" : "NO",
      item.defaultSelected ? "YES" : "NO",
      item.sort,
      item.isActive ? "YES" : "NO",
    ]),
    [30, 34, 34, 12, 34, 40, 14, 52, 14, 16, 8, 10]
  );

  return workbook;
}
