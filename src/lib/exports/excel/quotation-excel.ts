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
  cell.alignment = {
    vertical: "middle",
  };
}

export async function buildQuotationExcel(quotation: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS-Medialab";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Quotation", {
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
    { key: "a", width: 5 },
    { key: "b", width: 26 },
    { key: "c", width: 20 },
    { key: "d", width: 28 },
    { key: "e", width: 22 },
    { key: "f", width: 16 },
    { key: "g", width: 16 },
    { key: "h", width: 18 },
    { key: "i", width: 18 },
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

  sheet.mergeCells("D1:I1");
  sheet.getCell("D1").value = "QUOTATION";
  sheet.getCell("D1").font = {
    bold: true,
    size: 22,
    color: { argb: "FF0F172A" },
  };
  sheet.getCell("D1").alignment = { horizontal: "right" };

  sheet.mergeCells("D2:I2");
  sheet.getCell("D2").value = `No: ${quotation.quotationNo}`;
  sheet.getCell("D2").alignment = { horizontal: "right" };
  sheet.getCell("D2").font = { bold: true, color: { argb: "FF475569" } };

  sheet.mergeCells("D3:I3");
  sheet.getCell("D3").value = `Date: ${formatDate(quotation.quotationDate)} | Valid Until: ${formatDate(
    quotation.validUntil
  )}`;
  sheet.getCell("D3").alignment = { horizontal: "right" };
  sheet.getCell("D3").font = { color: { argb: "FF64748B" } };

  sheet.mergeCells("A5:I5");
  sheet.getCell("A5").value = "Customer Information";
  styleSection(sheet.getCell("A5"));

  const customer = quotation.customer;

  const infoRows = [
    ["Customer / Company", customer.company || customer.name || "-"],
    ["Contact Person", customer.contactPerson || "-"],
    ["Email", customer.email || "-"],
    ["Phone", customer.phone || "-"],
    [
      "Address",
      [customer.addressLine1, customer.addressLine2].filter(Boolean).join(", ") ||
        "-",
    ],
    ["Billing Company", customer.billingCompany || customer.company || "-"],
    ["Billing Email", customer.billingEmail || customer.email || "-"],
    ["Document Receiver", customer.documentCompany || customer.company || "-"],
    ["Recipient Email", customer.recipientEmail1 || customer.email || "-"],
  ];

  let rowIndex = 6;

  for (const row of infoRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:I${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Quotation Detail";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const detailRows = [
    ["Template COA", quotation.coaTemplate?.name || "-"],
    ["Sampling By", samplingByLabel(quotation.samplingBy)],
    ["Testing Objective", testingObjectiveLabel(quotation.testingObjective)],
    ["TAT Requested", tatLabel(quotation.tatRequested)],
    ["Note", quotation.note || "-"],
  ];

  for (const row of detailRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:I${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Parameter & Pricing";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const headerRow = rowIndex;
  const headers = [
    "No",
    "Description",
    "Sample ID",
    "Sampling Location",
    "Matrix / Regulation",
    "Duration",
    "Qty",
    "Price",
    "Subtotal",
  ];

  headers.forEach((header, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
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

  quotation.items.forEach((item: any, index: number) => {
    sheet.getCell(rowIndex, 1).value = index + 1;
    sheet.getCell(rowIndex, 2).value = item.description || item.parameter.name;
    sheet.getCell(rowIndex, 3).value = item.customerSampleId || "-";
    sheet.getCell(rowIndex, 4).value = item.samplingLocation || "-";
    sheet.getCell(rowIndex, 5).value = item.regulationMatrix || "-";
    sheet.getCell(rowIndex, 6).value = item.durationSampling || "-";
    sheet.getCell(rowIndex, 7).value = item.qty;
    sheet.getCell(rowIndex, 8).value = item.price;
    sheet.getCell(rowIndex, 9).value = item.price * item.qty;

    for (let col = 1; col <= 9; col++) {
      const cell = sheet.getCell(rowIndex, col);
      setThinBorder(cell);
      cell.alignment = {
        vertical: "top",
        wrapText: true,
      };
    }

    sheet.getCell(rowIndex, 8).numFmt = rupiahFormat();
    sheet.getCell(rowIndex, 9).numFmt = rupiahFormat();

    rowIndex++;
  });

  rowIndex += 1;

  const parameterTotal = quotation.totalAmount || 0;
  const samplingCost = quotation.samplingCost || 0;
  const vatPercent = quotation.vatPercent || 0;
  const vatAmount = quotation.vatAmount || 0;
  const grandTotal =
    quotation.grandTotal && quotation.grandTotal > 0
      ? quotation.grandTotal
      : parameterTotal + samplingCost + vatAmount;

  const summaryRows = [
    ["Parameter Total", parameterTotal],
    ["Sampling Cost", samplingCost],
    [`VAT ${vatPercent}%`, vatAmount],
    ["Grand Total", grandTotal],
  ];

  for (const row of summaryRows) {
    sheet.getCell(`H${rowIndex}`).value = row[0];
    sheet.getCell(`I${rowIndex}`).value = row[1];

    styleLabel(sheet.getCell(`H${rowIndex}`));
    styleValue(sheet.getCell(`I${rowIndex}`));
    sheet.getCell(`I${rowIndex}`).numFmt = rupiahFormat();

    if (row[0] === "Grand Total") {
      sheet.getCell(`H${rowIndex}`).font = {
        bold: true,
        color: { argb: "FF047857" },
      };
      sheet.getCell(`I${rowIndex}`).font = {
        bold: true,
        color: { argb: "FF047857" },
      };
      sheet.getCell(`H${rowIndex}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" },
      };
      sheet.getCell(`I${rowIndex}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" },
      };
    }

    rowIndex++;
  }

  rowIndex += 1;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Terms & Conditions";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value =
    quotation.paymentTerm || "Pembayaran dilakukan sesuai kesepakatan.";
  sheet.getCell(`A${rowIndex}`).alignment = { wrapText: true };
  setThinBorder(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value =
    quotation.termsNote ||
    "Harga belum termasuk biaya tambahan di luar lingkup pekerjaan yang disepakati.";
  sheet.getCell(`A${rowIndex}`).alignment = { wrapText: true };
  setThinBorder(sheet.getCell(`A${rowIndex}`));

  sheet.eachRow((row) => {
    row.height = 22;
  });

  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 22;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}