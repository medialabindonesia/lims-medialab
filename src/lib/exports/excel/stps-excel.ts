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

function getSamplers(stps: any) {
  return [
    {
      name: stps.sampler1Name,
      position: stps.sampler1Position,
    },
    {
      name: stps.sampler2Name,
      position: stps.sampler2Position,
    },
    {
      name: stps.sampler3Name,
      position: stps.sampler3Position,
    },
    {
      name: stps.sampler4Name,
      position: stps.sampler4Position,
    },
  ].filter((item) => item.name || item.position);
}

export async function buildStpsExcel(stps: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LIMS-Medialab";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("STPS", {
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
    { width: 8 },
    { width: 30 },
    { width: 35 },
    { width: 35 },
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

  const quotation = stps.quotation;
  const customer = quotation.customer;

  sheet.mergeCells("C1:D1");
  sheet.getCell("C1").value = "SURAT TUGAS PENGAMBILAN SAMPEL";
  sheet.getCell("C1").font = {
    bold: true,
    size: 17,
    color: { argb: "FF0F172A" },
  };
  sheet.getCell("C1").alignment = { horizontal: "right" };

  sheet.mergeCells("C2:D2");
  sheet.getCell("C2").value = `STPS No: ${stps.stpsNo}`;
  sheet.getCell("C2").alignment = { horizontal: "right" };
  sheet.getCell("C2").font = { bold: true, color: { argb: "FF475569" } };

  sheet.mergeCells("C3:D3");
  sheet.getCell("C3").value = `Issued Date: ${formatDate(stps.issuedDate)}`;
  sheet.getCell("C3").alignment = { horizontal: "right" };
  sheet.getCell("C3").font = { color: { argb: "FF64748B" } };

  let rowIndex = 5;

  sheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Document Reference";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const rows = [
    ["Quotation No", quotation.quotationNo],
    ["LTR No", quotation.ltr?.ltrNo || "-"],
    ["COC No", quotation.coc?.cocNo || "-"],
    ["Customer", customer.company || customer.name || "-"],
    [
      "Sampling Location",
      [customer.samplingAddressLine1, customer.samplingAddressLine2]
        .filter(Boolean)
        .join(", ") || "-",
    ],
    ["Technical Manager", stps.technicalManagerName || "-"],
    ["Technical Manager Position", stps.technicalManagerPosition || "-"],
  ];

  for (const row of rows) {
    sheet.getCell(`A${rowIndex}`).value = row[0];
    sheet.getCell(`B${rowIndex}`).value = row[1];
    sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);

    styleLabel(sheet.getCell(`A${rowIndex}`));
    styleValue(sheet.getCell(`B${rowIndex}`));

    rowIndex++;
  }

  rowIndex++;

  sheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = "Assigned Samplers";
  styleSection(sheet.getCell(`A${rowIndex}`));

  rowIndex++;

  const headers = ["No", "Name", "Position", "Signature"];

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
      horizontal: "center",
      vertical: "middle",
    };
    setThinBorder(cell);
  });

  rowIndex++;

  const samplers = getSamplers(stps);

  if (samplers.length === 0) {
    samplers.push({
      name: "-",
      position: "-",
    });
  }

  samplers.forEach((sampler, index) => {
    sheet.getCell(rowIndex, 1).value = index + 1;
    sheet.getCell(rowIndex, 2).value = sampler.name || "-";
    sheet.getCell(rowIndex, 3).value = sampler.position || "-";
    sheet.getCell(rowIndex, 4).value = "";

    for (let col = 1; col <= 4; col++) {
      const cell = sheet.getCell(rowIndex, col);
      setThinBorder(cell);
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
      };
    }

    sheet.getRow(rowIndex).height = 34;
    rowIndex++;
  });

  rowIndex += 2;

  sheet.mergeCells(`C${rowIndex}:D${rowIndex}`);
  sheet.getCell(`C${rowIndex}`).value = `Jakarta, ${formatDate(stps.issuedDate)}`;
  sheet.getCell(`C${rowIndex}`).alignment = { horizontal: "center" };

  rowIndex++;

  sheet.mergeCells(`C${rowIndex}:D${rowIndex}`);
  sheet.getCell(`C${rowIndex}`).value =
    stps.technicalManagerPosition || "Technical Manager";
  sheet.getCell(`C${rowIndex}`).alignment = { horizontal: "center" };

  rowIndex += 4;

  sheet.mergeCells(`C${rowIndex}:D${rowIndex}`);
  sheet.getCell(`C${rowIndex}`).value =
    stps.technicalManagerName || "Technical Manager";
  sheet.getCell(`C${rowIndex}`).font = { bold: true };
  sheet.getCell(`C${rowIndex}`).alignment = { horizontal: "center" };

  sheet.eachRow((row) => {
    if (!row.height) row.height = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}