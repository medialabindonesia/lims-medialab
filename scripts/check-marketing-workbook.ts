import ExcelJS from "exceljs";
import {
  buildMarketingMasterWorkbook,
  parseDurations,
  formatDurations,
  SHEETS,
} from "../src/lib/marketing-master-workbook";
import { readHeaderMap, getCell, money, optionalYes, normalizeCode } from "../src/lib/excel-import";

function assert(cond: boolean, label: string) {
  if (!cond) throw new Error("GAGAL: " + label);
  console.log("  ok  " + label);
}

async function main() {
  console.log("1. parseDurations / formatDurations");
  const raw = "*1 Jam=150 µg/m³ | 24 Jam=75 µg/m³ | 1 Tahun";
  const parsed = parseDurations(raw);
  assert(parsed.length === 3, "tiga durasi terbaca");
  assert(parsed[0].isDefault === true, "durasi pertama ditandai default");
  assert(parsed[0].label === "1 Jam", "label bersih dari tanda *");
  assert(parsed[0].limitValue === "150 µg/m³", "baku mutu terbaca");
  assert(parsed[2].limitValue === null, "durasi tanpa baku mutu jadi null");
  assert(parseDurations(null).length === 0, "sel kosong aman");
  assert(parseDurations("  |  | ").length === 0, "pemisah kosong diabaikan");

  const reparsed = parseDurations(formatDurations(parsed));
  assert(JSON.stringify(reparsed) === JSON.stringify(parsed), "format lalu parse kembali identik");

  console.log("2. helper sel");
  assert(money("Rp 1.500.000") === 1500000, "harga berformat rupiah terbaca");
  assert(money("") === null, "harga kosong jadi null, bukan 0");
  assert(money("0") === 0, "nol tetap nol");
  assert(optionalYes("") === null, "isActive kosong = tidak diisi");
  assert(optionalYes("NO") === false, "NO terbaca false");
  assert(optionalYes("ya") === true, "ya terbaca true");
  assert(normalizeCode("Air  Limbah Industri") === "AIR_LIMBAH_INDUSTRI", "kode dinormalkan");
  assert(normalizeCode("air limbah  industri") === normalizeCode("Air Limbah Industri"), "variasi ketik menghasilkan kode sama");

  console.log("3. workbook bolak-balik");
  const wb = buildMarketingMasterWorkbook({
    matrices: [
      { code: "UDARA", name: "Udara", parentCode: null, note: null, sort: 1, isActive: true },
      { code: "UDARA_AMBIEN", name: "Udara Ambien", parentCode: "UDARA", note: null, sort: 2, isActive: true },
    ],
    regulations: [
      { code: "PP22_2021_L7", name: "PP RI No. 22 Tahun 2021 Lampiran VII", shortName: "PP 22/2021 Lamp VII", matrixCode: "UDARA_AMBIEN", note: null, sort: 1, isActive: true },
    ],
    parameters: [
      { regulationCode: "PP22_2021_L7", parameterName: "Sulfur Dioksida (SO2)", displayName: "Sulfur Dioksida (SO₂)", unit: "µg/m³", method: "MASA 704B", limitValue: null, basePrice: 150000, durations: parsed, isAccredited: true, defaultSelected: true, sort: 1, isActive: true },
      { regulationCode: "PP22_2021_L7", parameterName: "Timbal (Pb)", displayName: null, unit: "µg/m³", method: "AAS", limitValue: null, basePrice: null, durations: [], isAccredited: false, defaultSelected: true, sort: 2, isActive: true },
    ],
  });

  const buffer = await wb.xlsx.writeBuffer();
  const back = new ExcelJS.Workbook();
  await back.xlsx.load(buffer as never);

  for (const name of [SHEETS.instructions, SHEETS.matrices, SHEETS.regulations, SHEETS.parameters]) {
    assert(Boolean(back.getWorksheet(name)), `sheet "${name}" ada`);
  }

  const paramSheet = back.getWorksheet(SHEETS.parameters)!;
  const headers = readHeaderMap(paramSheet);
  for (const h of ["regulationcode", "parametername", "baseprice", "durations", "isaccredited"]) {
    assert(headers.has(h), `header ${h} terpetakan`);
  }

  const row2 = paramSheet.getRow(2);
  assert(getCell(row2, headers, "regulationCode") === "PP22_2021_L7", "regulationCode kembali utuh");
  assert(getCell(row2, headers, "parameterName") === "Sulfur Dioksida (SO2)", "parameterName kembali utuh");
  assert(money(getCell(row2, headers, "basePrice")) === 150000, "basePrice kembali utuh");
  assert(JSON.stringify(parseDurations(getCell(row2, headers, "durations"))) === JSON.stringify(parsed), "durasi kembali utuh lewat Excel");

  const row3 = paramSheet.getRow(3);
  assert(money(getCell(row3, headers, "basePrice")) === null, "harga kosong tetap null setelah bolak-balik");
  assert(optionalYes(getCell(row3, headers, "isAccredited")) === false, "isAccredited NO bertahan");

  const matrixSheet = back.getWorksheet(SHEETS.matrices)!;
  const mHeaders = readHeaderMap(matrixSheet);
  assert(getCell(matrixSheet.getRow(3), mHeaders, "parentCode") === "UDARA", "parentCode kembali utuh");

  console.log("\nSEMUA LOLOS");
}

main().catch((error) => {
  console.error("\n" + error.message);
  process.exit(1);
});
