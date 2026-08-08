import type ExcelJS from "exceljs";

/**
 * Helper pembacaan sel Excel yang dipakai bersama seluruh importer master data.
 *
 * Sel Excel jarang berisi string polos: bisa berupa rich text, hasil formula,
 * hyperlink, atau Date. Semua kasus itu diratakan di sini agar tiap importer
 * tidak perlu menangani ulang.
 */

export function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    if (typeof objectValue.text === "string") {
      return objectValue.text.trim() || null;
    }

    if (Array.isArray(objectValue.richText)) {
      const text = objectValue.richText
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          const textValue = (item as Record<string, unknown>).text;
          return typeof textValue === "string" ? textValue : "";
        })
        .join("")
        .trim();

      return text || null;
    }

    if (objectValue.result !== undefined) {
      return clean(objectValue.result);
    }
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

export function yes(value: unknown) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  return ["yes", "y", "true", "1", "aktif", "active", "ya"].includes(text);
}

/**
 * Boolean yang membedakan "tidak diisi" dari "diisi tidak".
 * Kolom kosong mengembalikan null agar pemanggil bisa memakai nilai default.
 */
export function optionalYes(value: unknown): boolean | null {
  const text = String(value ?? "").trim();
  if (!text) return null;

  if (["no", "n", "false", "0", "tidak", "nonaktif", "inactive"].includes(text.toLowerCase())) {
    return false;
  }

  return yes(text);
}

/**
 * Angka dari sel yang mungkin diketik manusia: "1.500.000", "Rp 1.500.000",
 * "1500000", atau kosong.
 *
 * Mengembalikan null untuk sel kosong — penting untuk harga, karena null
 * berarti "belum ditetapkan" dan berbeda dari 0.
 */
export function money(value: unknown): number | null {
  const text = clean(value);
  if (!text) return null;

  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;

  const parsed = Number(digits);

  return Number.isFinite(parsed) ? parsed : null;
}

export function integer(value: unknown, fallback: number): number {
  const text = clean(value);
  if (!text) return fallback;

  const parsed = Number.parseInt(text.replace(/[^\d-]/g, ""), 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export type HeaderMap = Map<string, number>;

/**
 * Memetakan nama kolom baris pertama ke nomor kolomnya.
 * Nama dicocokkan tanpa memedulikan besar-kecil huruf dan spasi berlebih,
 * karena header sering ikut tersunting saat file bolak-balik lewat email.
 */
export function readHeaderMap(sheet: ExcelJS.Worksheet): HeaderMap {
  const headerMap: HeaderMap = new Map();

  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value || "")
      .trim()
      .toLowerCase();

    if (key) headerMap.set(key, colNumber);
  });

  return headerMap;
}

export function getCell(
  row: ExcelJS.Row,
  headerMap: HeaderMap,
  key: string
): string | null {
  const col = headerMap.get(key.toLowerCase());
  if (!col) return null;

  return clean(row.getCell(col).value);
}

export function missingHeaders(headerMap: HeaderMap, required: string[]) {
  return required.filter((header) => !headerMap.has(header.toLowerCase()));
}

/**
 * Kode master dinormalkan agar tahan terhadap variasi pengetikan:
 * "air limbah industri" dan "Air Limbah  Industri" menghasilkan kode sama.
 */
export function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}
