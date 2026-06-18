import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/exports/format";

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

function getFinalCoaNo(invoice: any) {
  const sample = invoice.quotation.samples?.[0];
  const finalCoa = sample?.coa?.find((item: any) => item.type === "FINAL");
  return finalCoa?.coaNo || "-";
}

export async function buildInvoiceExcel(invoice: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS-Medialab";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Invoice", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  sheet.columns = [
    { width: 5 },
    { width: 34 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 20 },
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

  const quotation = invoice.quotation;
  const customer = quotation.customer;

  sheet.mergeCells("D1:F1");
  sheet.getCell("D1").value = "INVOICE";
  sheet.getCell("D1").font = {
    bold: true,
    size: 22,
    color: { argb: "FF0F172A" },
  };
  sheet.getCell("D1").alignment = { horizontal: "right" };

  sheet.mergeCells("D2:F2");
  sheet.getCell("D2").value = `Invoice No: ${invoice.invoiceNo}`;
  sheet.getCell("D2").alignment = { horizontal: "right" };
  sheet.getCell("D2").font = {
    bold: true,
    color: { argb: "FF475569" },
  };

  sheet.mergeCells("D3:F3");
  sheet.getCell("D3").value = `Date: ${formatDate(
    invoice.createdAt
  )} | Status: ${invoice.status}`;
  sheet.getCell("D3").alignment = { horizontal: "right" };
  sheet.getCell("D3").font = {
    color: { argb: "FF64748B" },
  };

  let rowIndex = 5;

  sheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Bill To";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const billRows = [
    ["Company", customer.billingCompany || customer.company || customer.name || "-"],
    [
      "Contact Person",
      customer.billingContactPerson || customer.contactPerson || "-",
    ],
    ["Billing Email", customer.billingEmail || customer.email || "-"],
    ["Billing Phone", customer.billingPhone || customer.phone || "-"],
    [
      "Billing Address",
      [customer.billingAddressLine1, customer.billingAddressLine2]
        .filter(Boolean)
        .join(", ") ||
        [customer.addressLine1, customer.addressLine2]
          .filter(Boolean)
          .join(", ") ||
        "-",
    ],
  ];

  for (const row of billRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:F${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Reference";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const referenceRows = [
    ["Quotation No", quotation.quotationNo],
    ["PO Number", quotation.purchaseOrder?.poNumber || "-"],
    ["LTR Number", quotation.ltr?.ltrNo || "-"],
    ["COC Number", quotation.coc?.cocNo || "-"],
    [
      "Sample Number",
      quotation.samples?.[0]?.sampleNo || quotation.coc?.sample?.sampleNo || "-",
    ],
    ["Final COA", getFinalCoaNo(invoice)],
    ["Template COA", quotation.coaTemplate?.name || "-"],
  ];

  for (const row of referenceRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:F${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Invoice Items";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const headerRow = rowIndex;
  const headers = ["No", "Description", "Sample ID", "Qty", "Unit Price", "Subtotal"];

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
    sheet.getCell(rowIndex, 4).value = item.qty || 1;
    sheet.getCell(rowIndex, 5).value = item.price || 0;
    sheet.getCell(rowIndex, 6).value = (item.price || 0) * (item.qty || 1);

    sheet.getCell(rowIndex, 5).numFmt = rupiahFormat();
    sheet.getCell(rowIndex, 6).numFmt = rupiahFormat();

    for (let col = 1; col <= 6; col++) {
      const cell = sheet.getCell(rowIndex, col);
      setThinBorder(cell);
      cell.alignment = {
        vertical: "top",
        wrapText: true,
      };
    }

    rowIndex++;
  });

  rowIndex++;

  const parameterTotal = quotation.totalAmount || 0;
  const samplingCost = quotation.samplingCost || 0;
  const vatPercent = quotation.vatPercent || 0;
  const vatAmount = quotation.vatAmount || 0;
  const invoiceAmount =
    invoice.amount ||
    quotation.grandTotal ||
    parameterTotal + samplingCost + vatAmount;

  const summaryRows = [
    ["Parameter Total", parameterTotal],
    ["Sampling Cost", samplingCost],
    [`VAT ${vatPercent}%`, vatAmount],
    ["Invoice Amount", invoiceAmount],
  ];

  for (const row of summaryRows) {
    sheet.getCell(`E${rowIndex}`).value = row[0];
    sheet.getCell(`F${rowIndex}`).value = row[1];

    styleLabel(sheet.getCell(`E${rowIndex}`));
    styleValue(sheet.getCell(`F${rowIndex}`));
    sheet.getCell(`F${rowIndex}`).numFmt = rupiahFormat();

    if (row[0] === "Invoice Amount") {
      sheet.getCell(`E${rowIndex}`).font = {
        bold: true,
        color: { argb: "FF047857" },
      };
      sheet.getCell(`F${rowIndex}`).font = {
        bold: true,
        color: { argb: "FF047857" },
      };
      sheet.getCell(`E${rowIndex}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" },
      };
      sheet.getCell(`F${rowIndex}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" },
      };
    }

    rowIndex++;
  }

  rowIndex += 1;

  sheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Payment Information";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value =
    quotation.paymentTerm || "Pembayaran dilakukan setelah invoice diterima.";
  sheet.getCell(`A${rowIndex}`).alignment = { wrapText: true };
  setThinBorder(sheet.getCell(`A${rowIndex}`));

  sheet.eachRow((row) => {
    if (!row.height) row.height = 22;
  });

  sheet.getRow(1).height = 28;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}