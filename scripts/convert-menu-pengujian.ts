import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ExcelJS from "exceljs";
import { buildMarketingMasterWorkbook, type MarketingMasterExport } from "../src/lib/marketing-master-workbook";
import { normalizeCode } from "../src/lib/excel-import";

const SOURCE_SHEETS = ["Database", "Database UE", "Parameter Lainnya"] as const;
const source = process.argv[2] || "C:/Users/UseR/Documents/MENU PENGUJIAN 2024.xlsx";
const output = process.argv[3] || path.join(process.cwd(), "docs/generated/master-marketing-menu-2024.xlsx");

function text(cell: ExcelJS.Cell) {
  const value = cell.value as { result?: unknown } | unknown;
  if (value && typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  return String(value ?? "").trim();
}
function clean(value: string) { return value.replace(/\s+/g, " ").trim(); }
function key(...parts: string[]) { return parts.map((part) => clean(part).toLocaleLowerCase("id-ID")).join("\u241f"); }
function code(label: string, prefix: string) {
  const normalized = normalizeCode(label).slice(0, 48) || prefix;
  return `${prefix}_${normalized}_${crypto.createHash("sha1").update(label).digest("hex").slice(0, 7).toUpperCase()}`;
}
function limit(value: string) { return value || null; }

type LegacyRow = {
  sheet: string; row: number; subject: string; matrix: string; regulationQuotation: string;
  regulationCoa: string; parameter: string; method: string; samplingMethod: string;
  sampleMatrix: string; limit1: string; limit2: string; unit: string; paraQuot: string; sampleSize: string;
};

async function main() {
  if (!fs.existsSync(source)) throw new Error(`Workbook tidak ditemukan: ${source}`);
  const sourceBook = new ExcelJS.Workbook();
  await sourceBook.xlsx.readFile(source);
  const rows: LegacyRow[] = [];

  for (const sheetName of SOURCE_SHEETS) {
    const sheet = sourceBook.getWorksheet(sheetName);
    if (!sheet) continue;
    const header = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, column) => header.set(clean(text(cell)).toUpperCase(), column));
    const get = (row: ExcelJS.Row, name: string) => text(row.getCell(header.get(name) || 999));
    for (let rowNo = 2; rowNo <= sheet.rowCount; rowNo += 1) {
      const row = sheet.getRow(rowNo);
      const subject = get(row, "SUBJECT");
      const matrix = get(row, "MATRIX");
      const parameter = get(row, "PARAMETER");
      if (!subject && !matrix && !parameter) continue;
      rows.push({
        sheet: sheetName, row: rowNo, subject, matrix,
        regulationQuotation: get(row, "REGULATION IN QUOTATION"), regulationCoa: get(row, "REGULATION IN COA"),
        parameter, method: get(row, "TESTING METHOD"), samplingMethod: get(row, "SAMPLING METHOD"),
        sampleMatrix: get(row, "SAMPLE MATRIX"), limit1: get(row, "LIMIT1"), limit2: get(row, "LIMIT2"),
        unit: get(row, "UNIT"), paraQuot: get(row, "PARA QUOT"), sampleSize: get(row, "SAMPLE SIZE"),
      });
    }
  }

  const incomplete = rows.filter((row) => !row.subject || !row.matrix || !row.parameter);
  const valid = rows.filter((row) => row.subject && row.matrix && row.parameter);
  const exactSeen = new Set<string>();
  const duplicates: LegacyRow[] = [];
  const uniqueRows = valid.filter((row) => {
    const businessKey = key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa, row.parameter, row.method, row.samplingMethod, row.sampleMatrix, row.limit1, row.limit2, row.unit, row.sampleSize);
    if (exactSeen.has(businessKey)) { duplicates.push(row); return false; }
    exactSeen.add(businessKey); return true;
  });
  const asteriskMismatch = uniqueRows.filter((row) => row.parameter.endsWith("*") !== row.paraQuot.endsWith("*"));

  const matrices: MarketingMasterExport["matrices"] = [];
  const matrixCodes = new Map<string, string>();
  const subjects = [...new Set(uniqueRows.map((row) => clean(row.subject)))];
  subjects.forEach((subject, index) => {
    const subjectCode = code(subject, "SUBJ");
    matrixCodes.set(key(subject), subjectCode);
    matrices.push({ code: subjectCode, name: subject, parentCode: null, note: "Sumber: MENU PENGUJIAN 2024.xlsx", sort: (index + 1) * 10, isActive: true });
  });
  const matrixPairs = [...new Map(uniqueRows.map((row) => [key(row.subject, row.matrix), row])).values()];
  matrixPairs.forEach((pair, index) => {
    const matrixCode = code(`${pair.subject}|${pair.matrix}`, "MTX");
    matrixCodes.set(key(pair.subject, pair.matrix), matrixCode);
    matrices.push({ code: matrixCode, name: clean(pair.matrix), parentCode: matrixCodes.get(key(pair.subject))!, note: `Subject: ${clean(pair.subject)}`, sort: (index + 1) * 10, isActive: true });
  });

  const regulationRows = [...new Map(uniqueRows.map((row) => [key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa), row])).values()];
  const regulationCodes = new Map<string, string>();
  const regulations: MarketingMasterExport["regulations"] = regulationRows.map((row, index) => {
    const fullName = clean(row.regulationCoa || row.regulationQuotation || "Tanpa regulasi / parameter lainnya");
    const shortName = clean(row.regulationQuotation || row.regulationCoa || "Parameter lainnya");
    const regulationCode = code(`${row.subject}|${row.matrix}|${shortName}|${fullName}`, "REG");
    regulationCodes.set(key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa), regulationCode);
    return { code: regulationCode, name: fullName, shortName, matrixCode: matrixCodes.get(key(row.subject, row.matrix))!, note: `Sumber ${row.sheet}`, sort: (index + 1) * 10, isActive: true };
  });

  // Satu parameter dapat muncul berulang untuk jam/durasi berbeda. Baris
  // dengan metode+unit sama digabung menjadi satu relasi berdurasi banyak;
  // metode berbeda tetap menjadi varian parameter terpisah dan tidak saling
  // menimpa ketika di-import.
  const parameterGroups = new Map<string, LegacyRow[]>();
  for (const row of uniqueRows) {
    const regulationCode = regulationCodes.get(key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa))!;
    const groupKey = key(regulationCode, row.parameter.replace(/\*+$/, ""), row.method, row.unit);
    parameterGroups.set(groupKey, [...(parameterGroups.get(groupKey) || []), row]);
  }
  const parameters: MarketingMasterExport["parameters"] = [...parameterGroups.values()].map((group, index) => {
    const row = group[0];
    const parameterName = clean(row.parameter.replace(/\*+$/, ""));
    const distinct = (values: string[]) => [...new Set(values.map(clean).filter(Boolean))];
    const durations = distinct(group.map((item) => item.samplingMethod)).map((label, durationIndex) => {
      const sourceRow = group.find((item) => clean(item.samplingMethod) === label)!;
      return { label, limitValue: limit(clean(sourceRow.limit1 || sourceRow.limit2)), isDefault: durationIndex === 0 };
    });
    return {
      regulationCode: regulationCodes.get(key(row.subject, row.matrix, row.regulationQuotation, row.regulationCoa))!,
      parameterName, displayName: clean(row.paraQuot.replace(/\*+$/, "")) || parameterName,
      unit: limit(clean(row.unit)), method: limit(clean(row.method)),
      limitValue: limit(distinct(group.map((item) => item.limit1)).join(" | ")),
      limitValue2: limit(distinct(group.map((item) => item.limit2)).join(" | ")),
      samplingMethod: limit(distinct(group.map((item) => item.samplingMethod)).join(" | ")),
      sampleMatrix: limit(distinct(group.map((item) => item.sampleMatrix)).join(" | ")),
      sampleSize: limit(distinct(group.map((item) => item.sampleSize)).join(" | ")),
      basePrice: null, durations,
      isAccredited: !group.some((item) => item.parameter.endsWith("*") || item.paraQuot.endsWith("*")),
      defaultSelected: true, sort: (index + 1) * 10, isActive: true,
    };
  });

  const result = buildMarketingMasterWorkbook({ matrices, regulations, parameters });
  const audit = result.addWorksheet("Audit Sumber");
  audit.addRow(["Metric", "Jumlah"]); audit.getRow(1).font = { bold: true };
  [["Baris sumber", rows.length], ["Baris valid", valid.length], ["Duplikat exact yang dilewati", duplicates.length], ["Baris tidak lengkap yang dikarantina", incomplete.length], ["Mismatch tanda *", asteriskMismatch.length], ["Matriks termasuk subject", matrices.length], ["Regulasi", regulations.length], ["Parameter-relasi", parameters.length]].forEach((row) => audit.addRow(row));
  audit.addRow([]); audit.addRow(["Baris dikarantina / perlu review", "Sheet", "Row", "Subject", "Matrix", "Parameter"]);
  incomplete.forEach((row) => audit.addRow(["INCOMPLETE", row.sheet, row.row, row.subject, row.matrix, row.parameter]));
  asteriskMismatch.forEach((row) => audit.addRow(["ASTERISK_MISMATCH", row.sheet, row.row, row.subject, row.matrix, `${row.parameter} <> ${row.paraQuot}`]));
  audit.columns = [{ width: 28 }, { width: 22 }, { width: 10 }, { width: 34 }, { width: 36 }, { width: 48 }];

  fs.mkdirSync(path.dirname(output), { recursive: true });
  await result.xlsx.writeFile(output);
  console.log(JSON.stringify({ source, output, sourceRows: rows.length, validRows: valid.length, duplicates: duplicates.length, incomplete: incomplete.length, asteriskMismatch: asteriskMismatch.length, matrices: matrices.length, regulations: regulations.length, parameters: parameters.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
