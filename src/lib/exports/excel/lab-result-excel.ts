import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/exports/format";

function setThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
}

function styleSection(cell: ExcelJS.Cell) {
  cell.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
}

function styleLabel(cell: ExcelJS.Cell) {
  cell.font = {
    bold: true,
    color: { argb: "FF475569" },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };
  setThinBorder(cell);
}

function styleValue(cell: ExcelJS.Cell) {
  cell.font = {
    color: { argb: "FF0F172A" },
  };
  setThinBorder(cell);
}

function getResultValue(item: any) {
  return (
    item.resultValue ??
    item.result ??
    item.value ??
    item.resultText ??
    item.resultNumber ??
    "-"
  );
}

function getUnit(item: any) {
  return item.unit || item.templateParameter?.unit || item.parameter?.unit || "-";
}

function getMethod(item: any) {
  return (
    item.method ||
    item.templateParameter?.method ||
    item.parameter?.method ||
    "-"
  );
}

function getStandard(item: any) {
  return (
    item.standardSnapshot ||
    item.standard ||
    item.templateParameter?.standard ||
    item.limitSnapshot ||
    item.templateParameter?.limitValue ||
    "-"
  );
}

export async function buildLabResultExcel(sample: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS-Medialab";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Lab Result", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  sheet.columns = [
    { width: 5 },
    { width: 30 },
    { width: 18 },
    { width: 14 },
    { width: 26 },
    { width: 24 },
    { width: 18 },
  ];

  const logoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "logo-medialab.png"
  );

  if (fs.existsSync(logoPath)) {
    const logoId = workbook.addImage({
      filename: logoPath,
      extension: "png",
    });

    sheet.addImage(logoId, {
      tl: { col: 0.2, row: 0.2 },
      ext: { width: 180, height: 58 },
    });
  }

  const customer = sample.customer || sample.quotation?.customer;
  const quotation = sample.quotation;

  sheet.mergeCells("D1:G1");
  sheet.getCell("D1").value = "LAB RESULT SUMMARY";
  sheet.getCell("D1").font = {
    bold: true,
    size: 20,
    color: { argb: "FF0F172A" },
  };
  sheet.getCell("D1").alignment = { horizontal: "right" };

  sheet.mergeCells("D2:G2");
  sheet.getCell("D2").value = `Sample No: ${sample.sampleNo}`;
  sheet.getCell("D2").alignment = { horizontal: "right" };
  sheet.getCell("D2").font = { bold: true, color: { argb: "FF475569" } };

  sheet.mergeCells("D3:G3");
  sheet.getCell("D3").value = `Status: ${sample.status} | Generated: ${formatDate(new Date())}`;
  sheet.getCell("D3").alignment = { horizontal: "right" };
  sheet.getCell("D3").font = { color: { argb: "FF64748B" } };

  let rowIndex = 5;

  sheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Sample Information";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const infoRows = [
    ["Customer / Company", customer?.company || customer?.name || "-"],
    ["Quotation No", quotation?.quotationNo || "-"],
    ["PO Number", quotation?.purchaseOrder?.poNumber || "-"],
    ["Template COA", sample.coaTemplate?.name || quotation?.coaTemplate?.name || "-"],
    ["Sample Status", sample.status || "-"],
  ];

  for (const row of infoRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:G${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Result Parameters";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const headers = [
    "No",
    "Parameter",
    "Result",
    "Unit",
    "Method",
    "Standard / Limit",
    "Status",
  ];

  headers.forEach((header, index) => {
    const cell = sheet.getCell(rowIndex, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FF064E3B" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFECFDF5" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    setThinBorder(cell);
  });

  rowIndex++;

  sample.parameters.forEach((item: any, index: number) => {
    sheet.getCell(rowIndex, 1).value = index + 1;
    sheet.getCell(rowIndex, 2).value =
      item.templateParameter?.displayName || item.parameter?.name || "-";
    sheet.getCell(rowIndex, 3).value = String(getResultValue(item));
    sheet.getCell(rowIndex, 4).value = getUnit(item);
    sheet.getCell(rowIndex, 5).value = getMethod(item);
    sheet.getCell(rowIndex, 6).value = getStandard(item);
    sheet.getCell(rowIndex, 7).value = item.status || "-";

    for (let col = 1; col <= 7; col++) {
      const cell = sheet.getCell(rowIndex, col);
      setThinBorder(cell);
      cell.alignment = {
        vertical: "top",
        wrapText: true,
      };
    }

    rowIndex++;
  });

  sheet.eachRow((row) => {
    if (!row.height) row.height = 22;
  });

  sheet.getRow(1).height = 28;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
