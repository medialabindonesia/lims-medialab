import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { formatDate, tatLabel } from "@/lib/exports/format";

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

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function deliveryMethodLabel(value?: string | null) {
  const labels: Record<string, string> = {
    MEDIALAB_SAMPLING: "Medialab Sampling",
    CUSTOMER_DELIVERY: "Customer Delivery",
    COURIER: "Courier",
    OTHER: "Other",
  };

  return value ? labels[value] || value : "-";
}

function getSamplingLocation(coc: any, customer: any) {
  return (
    coc.samplingLocation ||
    [customer.samplingAddressLine1, customer.samplingAddressLine2]
      .filter(Boolean)
      .join(", ") ||
    customer.samplingCompany ||
    "-"
  );
}

export async function buildCocExcel(coc: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS-Medialab";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("COC", {
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
    { width: 22 },
    { width: 34 },
    { width: 26 },
    { width: 20 },
    { width: 22 },
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

  const quotation = coc.quotation;
  const customer = quotation.customer;
  const samplingLocation = getSamplingLocation(coc, customer);

  sheet.mergeCells("D1:H1");
  sheet.getCell("D1").value = "CHAIN OF CUSTODY";
  sheet.getCell("D1").font = {
    bold: true,
    size: 20,
    color: { argb: "FF0F172A" },
  };
  sheet.getCell("D1").alignment = { horizontal: "right" };

  sheet.mergeCells("D2:H2");
  sheet.getCell("D2").value = `COC No: ${coc.cocNo}`;
  sheet.getCell("D2").alignment = { horizontal: "right" };
  sheet.getCell("D2").font = { bold: true, color: { argb: "FF475569" } };

  sheet.mergeCells("D3:H3");
  sheet.getCell("D3").value = `Quotation: ${quotation.quotationNo} | LTR: ${
    quotation.ltr?.ltrNo || "-"
  }`;
  sheet.getCell("D3").alignment = { horizontal: "right" };
  sheet.getCell("D3").font = { color: { argb: "FF64748B" } };

  let rowIndex = 5;

  sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Customer & Sampling Information";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const infoRows = [
    ["Customer / Company", customer.company || customer.name || "-"],
    ["Contact Person", customer.contactPerson || "-"],
    [
      "Customer Email COA",
      coc.customerEmailCoa || customer.recipientEmail1 || "-",
    ],
    ["Customer Code", coc.customerCode || "-"],
    ["Sampling Location", samplingLocation],
    ["Sampler Name", coc.samplerName || "-"],
    ["TAT Requested", tatLabel(coc.tatRequested)],
    ["Delivery Method", deliveryMethodLabel(coc.deliveryMethod)],
    [
      "Sample No",
      coc.sample?.sampleNo || quotation.samples?.[0]?.sampleNo || "-",
    ],
    ["Planned Sampling Start", formatDateTime(coc.plannedSamplingStart)],
    ["Planned Sampling End", formatDateTime(coc.plannedSamplingEnd)],
    ["Estimated COA Date", formatDate(coc.estimatedCoaDate)],
    ["Template COA", quotation.coaTemplate?.name || "-"],
  ];

  for (const row of infoRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:H${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));
    sheet.getCell(`B${rowIndex}`).alignment = {
      vertical: "top",
      wrapText: true,
    };

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Sample Condition & Instruction";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const conditionRows = [
    ["Sampling Info", coc.sampleConditionSamplingInfo || "-"],
    ["Method", coc.sampleConditionMethod || "-"],
    ["Received Condition", coc.sampleConditionReceived || "-"],
    ["Abnormal Condition", coc.abnormalCondition || "-"],
    ["Special Instruction", coc.specialInstruction || "-"],
  ];

  for (const row of conditionRows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:H${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));
    sheet.getCell(`B${rowIndex}`).alignment = {
      vertical: "top",
      wrapText: true,
    };

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
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
    sheet.getCell(rowIndex, 4).value =
      item.samplingLocation || samplingLocation;
    sheet.getCell(rowIndex, 5).value = item.regulationMatrix || "-";
    sheet.getCell(rowIndex, 6).value = item.durationSampling || "-";
    sheet.getCell(rowIndex, 7).value =
      item.method || item.parameter.method || "-";
    sheet.getCell(rowIndex, 8).value = item.qty || 1;

    for (let col = 1; col <= 8; col++) {
      const cell = sheet.getCell(rowIndex, col);
      setThinBorder(cell);
      cell.alignment = {
        vertical: "top",
        wrapText: true,
      };
    }

    rowIndex++;
  });

  rowIndex += 2;

  sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Sampler";
  sheet.getCell(`A${rowIndex}`).alignment = { horizontal: "center" };
  styleLabel(sheet.getCell(`A${rowIndex}`));

  sheet.mergeCells(`D${rowIndex}:E${rowIndex}`);
  sheet.getCell(`D${rowIndex}`).value = "Received by Lab";
  sheet.getCell(`D${rowIndex}`).alignment = { horizontal: "center" };
  styleLabel(sheet.getCell(`D${rowIndex}`));

  sheet.mergeCells(`F${rowIndex}:H${rowIndex}`);
  sheet.getCell(`F${rowIndex}`).value = "Customer";
  sheet.getCell(`F${rowIndex}`).alignment = { horizontal: "center" };
  styleLabel(sheet.getCell(`F${rowIndex}`));

  rowIndex += 4;

  sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = coc.samplerName || "Sampler";
  sheet.getCell(`A${rowIndex}`).alignment = { horizontal: "center" };
  styleValue(sheet.getCell(`A${rowIndex}`));

  sheet.mergeCells(`D${rowIndex}:E${rowIndex}`);
  sheet.getCell(`D${rowIndex}`).value = "Lab Admin";
  sheet.getCell(`D${rowIndex}`).alignment = { horizontal: "center" };
  styleValue(sheet.getCell(`D${rowIndex}`));

  sheet.mergeCells(`F${rowIndex}:H${rowIndex}`);
  sheet.getCell(`F${rowIndex}`).value =
    customer.contactPerson || "Customer";
  sheet.getCell(`F${rowIndex}`).alignment = { horizontal: "center" };
  styleValue(sheet.getCell(`F${rowIndex}`));

  sheet.eachRow((row) => {
    if (!row.height) row.height = 22;
  });

  sheet.getRow(1).height = 28;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}