import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import {
  formatDate,
  samplingByLabel,
  tatLabel,
  testingObjectiveLabel,
} from "@/lib/exports/format";

function rupiahFormat() {
  return '"Rp" #,##0';
}

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

export async function buildLtrExcel(ltr: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS-Medialab";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("LTR", {
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
    { width: 28 },
    { width: 20 },
    { width: 30 },
    { width: 26 },
    { width: 20 },
    { width: 16 },
    { width: 18 },
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

  const quotation = ltr.quotation;
  const customer = quotation.customer;

  sheet.mergeCells("D1:I1");
  sheet.getCell("D1").value = "LETTER OF TESTING REQUEST";
  sheet.getCell("D1").font = {
    bold: true,
    size: 20,
    color: { argb: "FF0F172A" },
  };
  sheet.getCell("D1").alignment = { horizontal: "right" };

  sheet.mergeCells("D2:I2");
  sheet.getCell("D2").value = `LTR No: ${ltr.ltrNo}`;
  sheet.getCell("D2").alignment = { horizontal: "right" };
  sheet.getCell("D2").font = {
    bold: true,
    color: { argb: "FF475569" },
  };

  sheet.mergeCells("D3:I3");
  sheet.getCell("D3").value = `Quotation: ${
    quotation.quotationNo
  } | Created: ${formatDate(ltr.createdAt)}`;
  sheet.getCell("D3").alignment = { horizontal: "right" };
  sheet.getCell("D3").font = {
    color: { argb: "FF64748B" },
  };

  let rowIndex = 5;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Customer Information";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const customerRows = [
    ["Customer / Company", customer.company || customer.name || "-"],
    ["Contact Person", customer.contactPerson || "-"],
    ["Email", customer.email || "-"],
    ["Phone", customer.phone || "-"],
    [
      "Sampling Address",
      [customer.samplingAddressLine1, customer.samplingAddressLine2]
        .filter(Boolean)
        .join(", ") || "-",
    ],
    ["Document Receiver", customer.documentCompany || customer.company || "-"],
    ["COA Recipient Email", customer.recipientEmail1 || customer.email || "-"],
  ];

  for (const row of customerRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:I${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Testing Request Detail";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const detailRows = [
    ["Quotation No", quotation.quotationNo],
    ["PO Number", quotation.purchaseOrder?.poNumber || "-"],
    ["Template COA", quotation.coaTemplate?.name || "-"],
    ["Sampling By", samplingByLabel(quotation.samplingBy)],
    ["Testing Objective", testingObjectiveLabel(quotation.testingObjective)],
    ["TAT Requested", tatLabel(quotation.tatRequested)],
    ["Quotation Date", formatDate(quotation.quotationDate)],
    ["Valid Until", formatDate(quotation.validUntil)],
    ["Grand Total", quotation.grandTotal || quotation.totalAmount || 0],
  ];

  for (const row of detailRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];

    sheet.mergeCells(`B${rowIndex}:I${rowIndex}`);
    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    if (row[0] === "Grand Total") {
      sheet.getCell(`B${rowIndex}`).numFmt = rupiahFormat();
      sheet.getCell(`B${rowIndex}`).font = {
        bold: true,
        color: { argb: "FF047857" },
      };
    }

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Parameter Matrix";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const headerRow = rowIndex;
  const headers = [
    "No",
    "Parameter",
    "Sample ID",
    "Sampling Location",
    "Matrix / Regulation",
    "Duration",
    "Method",
    "Qty",
    "Price",
  ];

  headers.forEach((header, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = {
      bold: true,
      color: { argb: "FF064E3B" },
    };
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

  quotation.items.forEach((item: any, index: number) => {
    sheet.getCell(rowIndex, 1).value = index + 1;
    sheet.getCell(rowIndex, 2).value = item.description || item.parameter.name;
    sheet.getCell(rowIndex, 3).value = item.customerSampleId || "-";
    sheet.getCell(rowIndex, 4).value = item.samplingLocation || "-";
    sheet.getCell(rowIndex, 5).value = item.regulationMatrix || "-";
    sheet.getCell(rowIndex, 6).value = item.durationSampling || "-";
    sheet.getCell(rowIndex, 7).value = item.method || item.parameter.method || "-";
    sheet.getCell(rowIndex, 8).value = item.qty || 1;
    sheet.getCell(rowIndex, 9).value = item.price || 0;
    sheet.getCell(rowIndex, 9).numFmt = rupiahFormat();

    for (let col = 1; col <= 9; col++) {
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
    row.height = 22;
  });

  sheet.getRow(1).height = 28;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}