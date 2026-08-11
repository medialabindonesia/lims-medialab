import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import {
  formatDate,
  samplingByLabel,
  tatLabel,
} from "@/lib/exports/format";
import {
  getQuotationDocumentConfig,
  type QuotationDocumentConfig,
} from "@/lib/exports/quotation-document-config";

const COLOR = {
  ink: "FF172033",
  muted: "FF526175",
  green: "FF087A4B",
  greenDark: "FF075D3D",
  greenPale: "FFEAF6EF",
  slatePale: "FFF5F7FA",
  border: "FFB8C2CC",
  white: "FFFFFFFF",
};

const DASH = "—";

type TestingRow = {
  no: number | null;
  description: string;
  sampleAndLocation: string;
  regulation: string;
  parameter: string;
  method: string;
  duration: string;
  qty: number | null;
  unitPrice: number | null;
  subtotal: number | null;
};

type ChargeCategory = "SAMPLING" | "DOCUMENT" | "OTHER";

type ChargeRow = {
  category: ChargeCategory;
  description: string;
  qty: number;
  unitPrice: number | null;
  subtotal: number | null;
  sort: number;
};

function rupiahFormat() {
  return '"Rp" #,##0;[Red]-"Rp" #,##0;"Rp" 0';
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = asNumber(value);
    if (number !== null) return number;
  }

  return null;
}

function cleanText(value: unknown, fallback = DASH) {
  if (typeof value !== "string") return fallback;

  const text = value.trim();
  return text || fallback;
}

function joinText(values: unknown[], separator = "\n") {
  const parts = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return parts.length ? parts.join(separator) : DASH;
}

function itemParameterName(item: any) {
  const name = cleanText(
    item.displayName ||
      item.regulationParameter?.displayName ||
      item.parameter?.name ||
      item.description
  );
  const accredited =
    item.isAccredited ?? item.regulationParameter?.isAccredited ?? true;

  return accredited === false && !name.endsWith("*") ? `${name}*` : name;
}

function groupUsesPackagePricing(group: any) {
  if (group.pricingMode === "PACKAGE") return true;
  if (group.pricingMode === "ITEM") return false;

  // Kompatibilitas untuk payload generator lama yang belum memiliki mode.
  return (
    Object.prototype.hasOwnProperty.call(group, "unitPrice") ||
    group.packagePrice !== undefined
  );
}

function objectiveLabel(value?: string | null) {
  const labels: Record<string, string> = {
    ROUTINE_MONITORING: "Pemantauan rutin",
    SUPERVISION: "Pengawasan",
    CASE_PROOF: "Pembuktian kasus",
    RESEARCH: "Penelitian",
    OTHER: "Lainnya",
  };

  return value ? labels[value] || value : DASH;
}

function tatBusinessDays(quotation: any) {
  if (quotation.tatRequested === "TOP_URGENT") return 5;
  if (quotation.tatRequested === "URGENT") return 7;
  return 10;
}

function tatMultiplier(quotation: any) {
  if (quotation.tatRequested === "TOP_URGENT") return 1.5;
  if (quotation.tatRequested === "URGENT") return 1.3;
  return 1;
}

function quotationTerms(
  quotation: any,
  config: QuotationDocumentConfig
): string[] {
  const custom = Array.isArray(quotation.terms)
    ? quotation.terms
    : Array.isArray(quotation.termItems)
      ? quotation.termItems
      : null;
  if (custom) {
    const normalized: string[] = custom
      .map((entry: any) =>
        typeof entry === "string" ? entry.trim() : entry?.text?.trim()
      )
      .filter((entry: unknown): entry is string =>
        typeof entry === "string" && entry.length > 0
      );
    if (normalized.length > 0) return normalized;
  }

  const terms = ["Parameter tidak terakreditasi ditandai dengan *."];
  if (config.minimumOrder !== null) {
    terms.push(
      `Minimum order IDR ${config.minimumOrder.toLocaleString("id-ID")}.`
    );
  }
  terms.push(
    "Purchase Order (PO), Surat Perintah Kerja (SPK), atau persetujuan quotation diperlukan sebelum pekerjaan dijadwalkan.",
    "Jadwal sampling diinformasikan setelah dokumen persetujuan diterima.",
    "Pelanggan menyediakan akses, fasilitas penunjang, dan kondisi lokasi yang aman untuk proses sampling.",
    `Hasil pengujian ditargetkan selesai ${tatBusinessDays(
      quotation
    )} hari kerja (${tatLabel(quotation.tatRequested)}) setelah sampel diterima dan dinyatakan memenuhi persyaratan.`
  );
  if (quotation.validUntil) {
    terms.push(`Quotation berlaku hingga ${formatDate(quotation.validUntil)}.`);
  }
  if (typeof quotation.paymentTerm === "string" && quotation.paymentTerm.trim()) {
    terms.push(quotation.paymentTerm.trim());
  }
  if (typeof quotation.termsNote === "string" && quotation.termsNote.trim()) {
    terms.push(
      ...quotation.termsNote
        .split(/\r?\n/)
        .map((term: string) => term.trim())
        .filter(Boolean)
    );
  }

  return terms;
}

function setThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: COLOR.border } },
    left: { style: "thin", color: { argb: COLOR.border } },
    bottom: { style: "thin", color: { argb: COLOR.border } },
    right: { style: "thin", color: { argb: COLOR.border } },
  };
}

function styleCells(
  sheet: ExcelJS.Worksheet,
  row: number,
  startColumn = 1,
  endColumn = 12
) {
  for (let column = startColumn; column <= endColumn; column += 1) {
    const cell = sheet.getCell(row, column);
    setThinBorder(cell);
    cell.alignment = { vertical: "top", wrapText: true };
    cell.font = { name: "Calibri", size: 9, color: { argb: COLOR.ink } };
  }
}

function mergeValue(
  sheet: ExcelJS.Worksheet,
  row: number,
  startColumn: number,
  endColumn: number,
  value: ExcelJS.CellValue
) {
  sheet.mergeCells(row, startColumn, row, endColumn);
  const cell = sheet.getCell(row, startColumn);
  cell.value = value;
  return cell;
}

function sectionBar(sheet: ExcelJS.Worksheet, row: number, label: string) {
  const cell = mergeValue(sheet, row, 1, 12, label);
  cell.font = {
    name: "Calibri",
    size: 9,
    bold: true,
    color: { argb: COLOR.greenDark },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR.greenPale },
  };
  cell.alignment = { vertical: "middle" };
  setThinBorder(cell);
  sheet.getRow(row).height = 18;
}

function writeMoney(cell: ExcelJS.Cell, value: number | null) {
  if (value === null) {
    cell.value = DASH;
    cell.alignment = { vertical: "top", horizontal: "center" };
    return;
  }

  cell.value = value;
  cell.numFmt = rupiahFormat();
  cell.alignment = { vertical: "top", horizontal: "right" };
}

function locationText(group: any, fallbackItem?: any) {
  const locations = Array.isArray(group.locations) ? group.locations : [];

  if (locations.length) {
    return locations
      .map((location: any) => {
        const label = cleanText(location.label, "");
        const sampleId = cleanText(location.customerSampleId, "");
        return [sampleId, label].filter(Boolean).join(" / ");
      })
      .filter(Boolean)
      .join("\n");
  }

  return joinText([
    fallbackItem?.customerSampleId,
    fallbackItem?.samplingLocation,
  ], " / ");
}

function testingRows(quotation: any) {
  const rows: TestingRow[] = [];
  const groups = Array.isArray(quotation.groups) ? quotation.groups : [];
  let hasUnpriced = false;

  if (groups.length) {
    groups.forEach((group: any, groupIndex: number) => {
      const items =
        Array.isArray(group.items) && group.items.length ? group.items : [{}];
      const packagePricing = groupUsesPackagePricing(group);
      const groupPrice = packagePricing
        ? firstNumber(group.unitPrice, group.packagePrice, group.price)
        : null;
      const groupQty = firstNumber(group.qty) ?? 1;
      if (packagePricing && groupPrice === null) hasUnpriced = true;
      const linkedRegulations = Array.isArray(group.regulationLinks)
        ? group.regulationLinks
            .map(
              (link: any) =>
                link.regulation?.shortName || link.regulation?.name || ""
            )
            .filter(Boolean)
            .join("\n")
        : "";
      let previousRegulation = "";

      items.forEach((item: any, itemIndex: number) => {
        const first = itemIndex === 0;
        const itemPrice = packagePricing
          ? first
            ? groupPrice
            : null
          : firstNumber(item.unitPrice, item.price);
        if (!packagePricing && itemPrice === null) hasUnpriced = true;
        const itemQty = packagePricing
          ? first
            ? groupQty
            : null
          : firstNumber(item.qty, group.qty) ?? 1;
        const itemRegulation = cleanText(item.regulationMatrix, "");
        const fallbackRegulation =
          linkedRegulations ||
          group.regulation?.shortName ||
          group.regulation?.name ||
          "";
        const regulation = itemRegulation || (first ? fallbackRegulation : "");
        const displayedRegulation =
          regulation && regulation !== previousRegulation ? regulation : "";
        if (regulation) previousRegulation = regulation;

        rows.push({
          no: first ? groupIndex + 1 : null,
          description: first
            ? cleanText(
                joinText(
                  [
                    group.description || group.matrix?.name || item.description,
                    group.note,
                  ],
                  "\n"
                )
              )
            : "",
          sampleAndLocation: first ? locationText(group, item) : "",
          regulation: displayedRegulation,
          parameter: itemParameterName(item),
          method: cleanText(
            item.method ||
              item.regulationParameter?.method ||
              item.parameter?.method
          ),
          duration: cleanText(
            item.duration?.label || item.durationSampling
          ),
          qty: itemQty,
          unitPrice: itemPrice,
          subtotal:
            itemPrice === null || itemQty === null
              ? null
              : itemPrice * itemQty,
        });
      });
    });
  } else {
    const items = Array.isArray(quotation.items) ? quotation.items : [];

    items.forEach((item: any, index: number) => {
      const qty = firstNumber(item.qty) ?? 1;
      const unitPrice = firstNumber(item.unitPrice, item.price);
      if (unitPrice === null) hasUnpriced = true;

      rows.push({
        no: index + 1,
        description: cleanText(
          item.description || item.parameter?.name || "Pengujian laboratorium"
        ),
        sampleAndLocation: joinText(
          [item.customerSampleId, item.samplingLocation],
          " / "
        ),
        regulation: cleanText(item.regulationMatrix),
        parameter: itemParameterName(item),
        method: cleanText(item.method || item.parameter?.method),
        duration: cleanText(item.duration?.label || item.durationSampling),
        qty,
        unitPrice,
        subtotal: unitPrice === null ? null : unitPrice * qty,
      });
    });
  }

  const computedTotal = rows.reduce(
    (total, row) => total + (row.subtotal ?? 0),
    0
  );
  return {
    rows,
    total: computedTotal,
    hasScope: rows.length > 0,
    hasUnpriced,
  };
}

function chargeCategory(value: unknown): ChargeCategory {
  const normalized = String(value || "OTHER").toUpperCase();

  if (normalized === "SAMPLING") return "SAMPLING";
  if (normalized === "DOCUMENT" || normalized === "DOCUMENTATION") {
    return "DOCUMENT";
  }

  return "OTHER";
}

function chargeRows(quotation: any) {
  const source = Array.isArray(quotation.chargeItems)
    ? quotation.chargeItems
    : Array.isArray(quotation.additionalCharges)
      ? quotation.additionalCharges
      : [];

  const rows: ChargeRow[] = source.map((item: any, index: number) => {
    const qty = firstNumber(item.qty, item.quantity) ?? 1;
    const unitPrice = firstNumber(item.unitPrice, item.price);
    const explicitSubtotal = firstNumber(item.subtotal, item.amount, item.total);

    return {
      category: chargeCategory(item.category || item.type),
      description: joinText(
        [
          item.description || item.name || item.label,
          item.detail,
          item.unit ? `Satuan: ${item.unit}` : "",
        ],
        "\n"
      ),
      qty,
      unitPrice,
      subtotal:
        explicitSubtotal ?? (unitPrice === null ? null : unitPrice * qty),
      sort: firstNumber(item.sort) ?? index,
    };
  });

  const samplingCost = asNumber(quotation.samplingCost);
  const hasSamplingLine = rows.some((row) => row.category === "SAMPLING");

  if (!hasSamplingLine && samplingCost !== null && samplingCost > 0) {
    rows.push({
      category: "SAMPLING",
      description: "Biaya sampling",
      qty: 1,
      unitPrice: samplingCost,
      subtotal: samplingCost,
      sort: Number.MAX_SAFE_INTEGER,
    });
  }

  return rows.sort((a, b) => a.sort - b.sort);
}

function personName(...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      "name" in candidate &&
      typeof candidate.name === "string" &&
      candidate.name.trim()
    ) {
      return candidate.name.trim();
    }
  }

  return DASH;
}

function documentControl(
  quotation: any,
  config: QuotationDocumentConfig
) {
  const control = quotation.documentControl || {};

  return {
    code: cleanText(control.code, config.formCode),
    revision: cleanText(control.revision, config.formRevision),
    effectiveDate: cleanText(control.effectiveDate, config.formEffectiveDate),
  };
}

export async function buildQuotationExcel(quotation: any) {
  const config = getQuotationDocumentConfig();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = config.companyName;
  workbook.lastModifiedBy = config.companyName;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const sheet = workbook.addWorksheet("Surat Penawaran", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 7 }],
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      showGridLines: false,
      margins: {
        left: 0.2,
        right: 0.2,
        top: 0.25,
        bottom: 0.45,
        header: 0.1,
        footer: 0.2,
      },
    },
    properties: { defaultRowHeight: 15 },
  });

  // Lebar kolom mengikuti struktur formulir Rev.07. G-H disimpan sebagai
  // spacer tersembunyi agar workbook tetap nyaman dibuka dan dicetak.
  sheet.columns = [
    { key: "no", width: 4 },
    { key: "description", width: 16 },
    { key: "sample", width: 17 },
    { key: "regulation", width: 18 },
    { key: "parameter", width: 22 },
    { key: "method", width: 27 },
    { key: "spacer1", width: 2, hidden: true },
    { key: "spacer2", width: 2, hidden: true },
    { key: "duration", width: 10 },
    { key: "qty", width: 7 },
    { key: "price", width: 13 },
    { key: "subtotal", width: 14 },
  ];

  const control = documentControl(quotation, config);
  sheet.headerFooter.oddFooter =
    `&L&9${control.code}; ${control.revision}; ${control.effectiveDate}` +
    `&R&9Halaman &P dari &N`;

  const logoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "logo-medialab.png"
  );

  if (fs.existsSync(logoPath)) {
    const logoId = workbook.addImage({ filename: logoPath, extension: "png" });
    sheet.addImage(logoId, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: 185, height: 58 },
    });
  }

  mergeValue(sheet, 1, 5, 12, "SURAT PENAWARAN");
  const title = sheet.getCell("E1");
  title.font = {
    name: "Calibri",
    size: 18,
    bold: true,
    color: { argb: COLOR.ink },
  };
  title.alignment = { horizontal: "right", vertical: "middle" };
  sheet.getRow(1).height = 28;

  mergeValue(sheet, 2, 5, 12, config.companyName);
  sheet.getCell("E2").font = {
    name: "Calibri",
    size: 10,
    bold: true,
    color: { argb: COLOR.green },
  };
  sheet.getCell("E2").alignment = { horizontal: "right" };

  const customer = quotation.customer || {};
  const tatDays = tatBusinessDays(quotation);
  const customerCode = cleanText(customer.customerCode);

  const headerLabel = (address: string, value: string) => {
    const cell = sheet.getCell(address);
    cell.value = value;
    cell.font = { name: "Calibri", size: 8, color: { argb: COLOR.muted } };
    cell.alignment = { vertical: "middle" };
  };

  const headerValue = (row: number, value: string) => {
    const cell = mergeValue(sheet, row, 10, 12, value);
    cell.font = {
      name: "Calibri",
      size: 8,
      bold: true,
      color: { argb: COLOR.ink },
    };
    cell.alignment = { horizontal: "right", vertical: "middle" };
  };

  headerLabel("I3", "No. Penawaran");
  headerValue(3, cleanText(quotation.quotationNo));
  headerLabel("I4", "Tanggal");
  headerValue(4, formatDate(quotation.quotationDate));
  headerLabel("I5", "Berlaku Hingga");
  headerValue(5, formatDate(quotation.validUntil));

  let rowIndex = 7;
  const blockHeader = (
    startColumn: number,
    endColumn: number,
    label: string
  ) => {
    const cell = mergeValue(sheet, rowIndex, startColumn, endColumn, label);
    cell.font = {
      name: "Calibri",
      size: 9,
      bold: true,
      color: { argb: COLOR.white },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR.green },
    };
    cell.alignment = { vertical: "middle" };
    setThinBorder(cell);
  };

  blockHeader(1, 4, "INFORMASI PELANGGAN");
  blockHeader(5, 8, "INFORMASI PENAGIHAN");
  blockHeader(9, 12, "DETAIL LAYANAN");
  sheet.getRow(rowIndex).height = 20;

  const customerLines = [
    cleanText(customer.company || customer.name),
    cleanText(customer.addressLine1),
    cleanText(customer.addressLine2),
    joinText(
      [
        customer.contactPerson ? `CP. ${customer.contactPerson}` : "",
        customer.phone ? `Tel. ${customer.phone}` : "",
      ],
      " | "
    ),
    customer.email ? `Email. ${customer.email}` : DASH,
  ];
  const billingLines = [
    cleanText(customer.billingCompany || customer.company || customer.name),
    cleanText(customer.billingAddressLine1 || customer.addressLine1),
    cleanText(customer.billingAddressLine2 || customer.addressLine2),
    joinText(
      [
        customer.billingContactPerson
          ? `CP. ${customer.billingContactPerson}`
          : customer.contactPerson
            ? `CP. ${customer.contactPerson}`
            : "",
        customer.billingPhone
          ? `Tel. ${customer.billingPhone}`
          : customer.phone
            ? `Tel. ${customer.phone}`
            : "",
      ],
      " | "
    ),
    customer.billingEmail
      ? `Email. ${customer.billingEmail}`
      : customer.email
        ? `Email. ${customer.email}`
        : DASH,
  ];
  const detailLines = [
    ["ID Pelanggan", customerCode],
    ["Sampling oleh", samplingByLabel(quotation.samplingBy)],
    ["Tujuan uji", objectiveLabel(quotation.testingObjective)],
    [
      "TAT",
      `${tatLabel(quotation.tatRequested || "NORMAL")} (${tatDays} hari kerja)`,
    ],
    ["Template CoA", cleanText(quotation.coaTemplate?.name)],
  ];

  for (let index = 0; index < 5; index += 1) {
    rowIndex += 1;
    styleCells(sheet, rowIndex);

    const customerCell = mergeValue(
      sheet,
      rowIndex,
      1,
      4,
      customerLines[index]
    );
    customerCell.alignment = { vertical: "top", wrapText: true };

    const billingCell = mergeValue(
      sheet,
      rowIndex,
      5,
      8,
      billingLines[index]
    );
    billingCell.alignment = { vertical: "top", wrapText: true };

    mergeValue(sheet, rowIndex, 9, 10, detailLines[index][0]);
    const detailValue = mergeValue(
      sheet,
      rowIndex,
      11,
      12,
      detailLines[index][1]
    );
    sheet.getCell(rowIndex, 9).font = {
      name: "Calibri",
      size: 8,
      bold: true,
      color: { argb: COLOR.muted },
    };
    detailValue.font = {
      name: "Calibri",
      size: 8,
      bold: true,
      color: { argb: COLOR.ink },
    };
    sheet.getRow(rowIndex).height = index === 1 || index === 2 ? 24 : 20;
  }

  rowIndex += 2;
  mergeValue(sheet, rowIndex, 1, 12, "Kepada pelanggan yang terhormat,");
  sheet.getCell(rowIndex, 1).font = {
    name: "Calibri",
    size: 9,
    color: { argb: COLOR.ink },
  };
  rowIndex += 1;
  mergeValue(
    sheet,
    rowIndex,
    1,
    12,
    "Bersama ini kami sampaikan penawaran harga sebagai berikut:"
  );

  if (typeof quotation.note === "string" && quotation.note.trim()) {
    rowIndex += 1;
    const noteCell = mergeValue(
      sheet,
      rowIndex,
      1,
      12,
      `Catatan: ${quotation.note.trim()}`
    );
    noteCell.font = {
      name: "Calibri",
      size: 8,
      italic: true,
      color: { argb: COLOR.muted },
    };
    noteCell.alignment = { vertical: "top", wrapText: true };
    sheet.getRow(rowIndex).height = 22;
  }

  rowIndex += 2;
  const tableHeaderRow = rowIndex;
  const tableHeaders: Array<[number, string]> = [
    [1, "No."],
    [2, "Deskripsi"],
    [3, "Customer Sample ID / Lokasi"],
    [4, "Regulasi\n(Matriks)"],
    [5, "Parameter Uji"],
    [6, "Metode"],
    [9, "Durasi Sampling"],
    [10, "Qty"],
    [11, "Harga"],
    [12, "Total"],
  ];

  styleCells(sheet, tableHeaderRow);
  for (let column = 1; column <= 12; column += 1) {
    const cell = sheet.getCell(tableHeaderRow, column);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR.greenDark },
    };
  }
  tableHeaders.forEach(([column, label]) => {
    const cell = sheet.getCell(tableHeaderRow, column);
    cell.value = label;
    cell.font = {
      name: "Calibri",
      size: 8,
      bold: true,
      color: { argb: COLOR.white },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  });
  sheet.getRow(tableHeaderRow).height = 34;

  const testing = testingRows(quotation);
  rowIndex += 1;
  sectionBar(sheet, rowIndex, "A. PENGUJIAN LABORATORIUM");

  if (!testing.rows.length) {
    rowIndex += 1;
    styleCells(sheet, rowIndex);
    mergeValue(
      sheet,
      rowIndex,
      1,
      12,
      "Parameter pengujian belum ditambahkan."
    );
    sheet.getCell(rowIndex, 1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
  } else {
    testing.rows.forEach((item) => {
      rowIndex += 1;
      styleCells(sheet, rowIndex);
      sheet.getCell(rowIndex, 1).value = item.no ?? "";
      sheet.getCell(rowIndex, 2).value = item.description;
      sheet.getCell(rowIndex, 3).value = item.sampleAndLocation;
      sheet.getCell(rowIndex, 4).value = item.regulation;
      sheet.getCell(rowIndex, 5).value = item.parameter;
      sheet.getCell(rowIndex, 6).value = item.method;
      sheet.getCell(rowIndex, 9).value = item.duration;
      sheet.getCell(rowIndex, 10).value = item.qty ?? "";
      writeMoney(sheet.getCell(rowIndex, 11), item.unitPrice);
      writeMoney(sheet.getCell(rowIndex, 12), item.subtotal);
      sheet.getCell(rowIndex, 1).alignment = {
        vertical: "top",
        horizontal: "center",
      };
      sheet.getCell(rowIndex, 10).alignment = {
        vertical: "top",
        horizontal: "center",
      };
      sheet.getRow(rowIndex).height = 28;
    });
  }

  const charges = chargeRows(quotation);
  const categoryConfig: Array<{
    category: ChargeCategory;
    label: string;
  }> = [
    { category: "SAMPLING", label: "B. SAMPLING" },
    { category: "DOCUMENT", label: "C. DOKUMEN" },
    { category: "OTHER", label: "D. BIAYA LAINNYA" },
  ];

  categoryConfig.forEach(({ category, label }) => {
    const categoryRows = charges.filter((item) => item.category === category);
    if (!categoryRows.length) return;

    rowIndex += 1;
    sectionBar(sheet, rowIndex, label);

    categoryRows.forEach((item, index) => {
      rowIndex += 1;
      styleCells(sheet, rowIndex);
      sheet.getCell(rowIndex, 1).value = index + 1;
      mergeValue(sheet, rowIndex, 2, 9, item.description);
      sheet.getCell(rowIndex, 10).value = item.qty;
      writeMoney(sheet.getCell(rowIndex, 11), item.unitPrice);
      writeMoney(sheet.getCell(rowIndex, 12), item.subtotal);
      sheet.getCell(rowIndex, 1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      sheet.getCell(rowIndex, 10).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      sheet.getRow(rowIndex).height = 22;
    });
  });

  const chargeTotal = charges.reduce(
    (total, item) => total + (item.subtotal ?? 0),
    0
  );
  const hasCommercialScope = testing.hasScope || charges.length > 0;
  const fullyPriced =
    hasCommercialScope &&
    !testing.hasUnpriced &&
    charges.every((item) => item.unitPrice !== null);
  const subtotal = testing.total + chargeTotal;
  const discount = Math.max(
    0,
    firstNumber(quotation.discountAmount, quotation.discount) ?? 0
  );
  const tatSurcharge = Math.max(
    0,
    firstNumber(quotation.tatSurchargeAmount) ?? 0
  );
  const priceMultiplier = tatMultiplier(quotation);
  const vatPercent = Math.max(0, firstNumber(quotation.vatPercent) ?? 11);
  const taxableAmount = Math.max(0, subtotal - discount + tatSurcharge);
  const vatAmount = taxableAmount * (vatPercent / 100);
  const grandTotal = taxableAmount + vatAmount;

  rowIndex += 2;
  const summary = [
    ["SUBTOTAL", subtotal],
    [cleanText(quotation.discountLabel, "DISKON").toUpperCase(), discount],
    [
      `TAMBAHAN TAT (${Math.round(
        (priceMultiplier - 1) * 100
      )}%)`,
      tatSurcharge,
    ],
    [`PPN ${vatPercent}%`, vatAmount],
    ["TOTAL (IDR)", grandTotal],
  ] as const;

  summary.forEach(([label, value], index) => {
    styleCells(sheet, rowIndex, 9, 12);
    mergeValue(sheet, rowIndex, 9, 11, label);
    const labelCell = sheet.getCell(rowIndex, 9);
    labelCell.font = {
      name: "Calibri",
      size: index === summary.length - 1 ? 10 : 9,
      bold: true,
      color: {
        argb: index === summary.length - 1 ? COLOR.greenDark : COLOR.muted,
      },
    };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb:
          index === summary.length - 1 ? COLOR.greenPale : COLOR.slatePale,
      },
    };
    const valueCell = sheet.getCell(rowIndex, 12);
    writeMoney(valueCell, fullyPriced ? value : null);
    valueCell.font = {
      name: "Calibri",
      size: index === summary.length - 1 ? 10 : 9,
      bold: true,
      color: {
        argb: index === summary.length - 1 ? COLOR.greenDark : COLOR.ink,
      },
    };
    if (index === summary.length - 1) {
      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR.greenPale },
      };
    }
    sheet.getRow(rowIndex).height = index === summary.length - 1 ? 23 : 20;
    rowIndex += 1;
  });

  rowIndex += 1;
  sectionBar(sheet, rowIndex, "INFORMASI PEMBAYARAN");
  const paymentLines = [
    config.bankName,
    config.bankAccountName ? `A/n. ${config.bankAccountName}` : null,
    config.bankAccountNumber
      ? `No. Rekening ${config.bankAccountNumber}`
      : null,
  ].filter((line): line is string => Boolean(line));

  if (paymentLines.length === 0) {
    paymentLines.push("Informasi rekening belum dikonfigurasi.");
  }

  paymentLines.forEach((line) => {
    rowIndex += 1;
    const cell = mergeValue(sheet, rowIndex, 1, 12, line);
    cell.font = { name: "Calibri", size: 8, color: { argb: COLOR.ink } };
    cell.alignment = { vertical: "middle" };
    sheet.getRow(rowIndex).height = 18;
  });

  rowIndex += 1;
  const addressHeader = (
    startColumn: number,
    endColumn: number,
    label: string
  ) => {
    const cell = mergeValue(sheet, rowIndex, startColumn, endColumn, label);
    cell.font = {
      name: "Calibri",
      size: 9,
      bold: true,
      color: { argb: COLOR.white },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR.green },
    };
    cell.alignment = { vertical: "middle" };
    setThinBorder(cell);
  };

  addressHeader(1, 4, "LOKASI SAMPLING");
  addressHeader(5, 8, "ALAMAT PENGIRIMAN DOKUMEN");
  addressHeader(9, 12, "EMAIL PENERIMA");
  sheet.getRow(rowIndex).height = 20;

  const samplingLines = [
    cleanText(customer.samplingCompany || customer.company || customer.name),
    cleanText(customer.samplingAddressLine1 || customer.addressLine1),
    cleanText(customer.samplingAddressLine2 || customer.addressLine2),
    joinText(
      [
        customer.samplingContactPerson
          ? `CP. ${customer.samplingContactPerson}`
          : customer.contactPerson
            ? `CP. ${customer.contactPerson}`
            : "",
        customer.samplingPhone
          ? `Tel. ${customer.samplingPhone}`
          : customer.phone
            ? `Tel. ${customer.phone}`
            : "",
      ],
      " | "
    ),
  ];
  const documentLines = [
    cleanText(customer.documentCompany || customer.company || customer.name),
    cleanText(customer.documentAddressLine1 || customer.addressLine1),
    cleanText(customer.documentAddressLine2 || customer.addressLine2),
    joinText(
      [
        customer.documentContactPerson
          ? `CP. ${customer.documentContactPerson}`
          : customer.contactPerson
            ? `CP. ${customer.contactPerson}`
            : "",
        customer.documentPhone
          ? `Tel. ${customer.documentPhone}`
          : customer.phone
            ? `Tel. ${customer.phone}`
            : "",
      ],
      " | "
    ),
  ];
  const recipientEmails = [
    customer.recipientEmail1 || customer.email,
    customer.recipientEmail2,
    customer.recipientEmail3,
    customer.recipientEmail4,
  ];

  for (let index = 0; index < 4; index += 1) {
    rowIndex += 1;
    styleCells(sheet, rowIndex);
    mergeValue(sheet, rowIndex, 1, 4, samplingLines[index]);
    mergeValue(sheet, rowIndex, 5, 8, documentLines[index]);
    mergeValue(
      sheet,
      rowIndex,
      9,
      12,
      `${index + 1}) ${cleanText(recipientEmails[index], "")}`.trim()
    );
    sheet.getRow(rowIndex).height = index === 1 || index === 2 ? 23 : 20;
  }

  rowIndex += 2;
  sectionBar(sheet, rowIndex, "SYARAT DAN KETENTUAN");

  const terms = quotationTerms(quotation, config);

  terms.forEach((term, index) => {
    rowIndex += 1;
    sheet.getCell(rowIndex, 1).value = index + 1;
    const cell = mergeValue(sheet, rowIndex, 2, 12, term);
    cell.alignment = { vertical: "top", wrapText: true };
    cell.font = { name: "Calibri", size: 8, color: { argb: COLOR.ink } };
    sheet.getCell(rowIndex, 1).alignment = {
      vertical: "top",
      horizontal: "center",
    };
    sheet.getCell(rowIndex, 1).font = {
      name: "Calibri",
      size: 8,
      color: { argb: COLOR.ink },
    };
    sheet.getRow(rowIndex).height = Math.min(
      42,
      18 + Math.floor(term.length / 115) * 9
    );
  });

  const salesName = personName(
    quotation.requestedBy,
    quotation.sales,
    quotation.createdBy,
    quotation.requestedByName
  );
  const managerName = personName(
    quotation.approvedBy,
    quotation.verifiedBy,
    quotation.manager,
    quotation.approvedByName,
    quotation.verifiedByName
  );
  const customerName = personName(customer.contactPerson);

  rowIndex += 2;
  const signatureHeaderRow = rowIndex;
  [
    [1, 4, "Dibuat Oleh,"],
    [5, 8, "Diketahui Oleh,"],
    [9, 12, "Disetujui Oleh,"],
  ].forEach(([start, end, label]) => {
    const cell = mergeValue(
      sheet,
      signatureHeaderRow,
      Number(start),
      Number(end),
      String(label)
    );
    cell.alignment = { horizontal: "center" };
    cell.font = { name: "Calibri", size: 9, bold: true };
  });

  rowIndex += 1;
  [
    [1, 4, "Sales Officer"],
    [5, 8, "Marketing & Sales Manager"],
    [9, 12, "Pelanggan"],
  ].forEach(([start, end, label]) => {
    const cell = mergeValue(
      sheet,
      rowIndex,
      Number(start),
      Number(end),
      String(label)
    );
    cell.alignment = { horizontal: "center" };
    cell.font = { name: "Calibri", size: 8, color: { argb: COLOR.muted } };
  });

  rowIndex += 1;
  sheet.getRow(rowIndex).height = 48;
  mergeValue(sheet, rowIndex, 1, 4, "");
  mergeValue(sheet, rowIndex, 5, 8, "");
  mergeValue(sheet, rowIndex, 9, 12, "");

  rowIndex += 1;
  [
    [1, 4, salesName],
    [5, 8, managerName],
    [9, 12, customerName],
  ].forEach(([start, end, name]) => {
    const cell = mergeValue(
      sheet,
      rowIndex,
      Number(start),
      Number(end),
      String(name)
    );
    cell.alignment = { horizontal: "center" };
    cell.font = { name: "Calibri", size: 9, bold: true };
  });

  rowIndex += 2;
  mergeValue(sheet, rowIndex, 1, 12, config.companyName);
  sheet.getCell(rowIndex, 1).font = {
    name: "Calibri",
    size: 9,
    bold: true,
    color: { argb: COLOR.greenDark },
  };
  sheet.getCell(rowIndex, 1).alignment = { horizontal: "center" };
  rowIndex += 1;
  mergeValue(
    sheet,
    rowIndex,
    1,
    12,
    config.companyAddress || "Alamat resmi belum dikonfigurasi"
  );
  sheet.getCell(rowIndex, 1).font = {
    name: "Calibri",
    size: 8,
    color: { argb: COLOR.muted },
  };
  sheet.getCell(rowIndex, 1).alignment = { horizontal: "center" };

  const corporateContact = [
    config.companyPhone ? `Telp. ${config.companyPhone}` : null,
    config.companyFax ? `Fax. ${config.companyFax}` : null,
    config.companyEmail,
    config.companyWebsite,
  ].filter((line): line is string => Boolean(line));
  rowIndex += 1;
  mergeValue(
    sheet,
    rowIndex,
    1,
    12,
    corporateContact.join(" | ") || "Kontak resmi belum dikonfigurasi"
  );
  sheet.getCell(rowIndex, 1).font = {
    name: "Calibri",
    size: 8,
    color: { argb: COLOR.muted },
  };
  sheet.getCell(rowIndex, 1).alignment = { horizontal: "center" };

  sheet.pageSetup.printArea = `A1:L${rowIndex}`;
  sheet.pageSetup.printTitlesRow = "1:6";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
