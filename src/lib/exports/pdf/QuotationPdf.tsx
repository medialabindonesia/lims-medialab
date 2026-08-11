import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatDate } from "@/lib/exports/format";
import {
  getQuotationDocumentConfig,
  type QuotationDocumentConfig,
} from "@/lib/exports/quotation-document-config";

type QuotationPdfProps = {
  logoSrc?: string | null;
  quotation: any;
};

type TestingLine = {
  key: string;
  description: string;
  locations: string;
  regulations: string;
  parameters: string;
  methods: string;
  durations: string;
  qty: number;
  unitPrice: number | null;
  total: number | null;
};

type ChargeCategory = "SAMPLING" | "DOCUMENT" | "OTHER";

type ChargeLine = {
  key: string;
  category: ChargeCategory;
  description: string;
  qty: number;
  unitPrice: number | null;
  total: number | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 78,
    paddingBottom: 34,
    paddingHorizontal: 18,
    fontFamily: "Helvetica",
    fontSize: 7,
    lineHeight: 1.25,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  runningHeader: {
    position: "absolute",
    top: 16,
    left: 18,
    right: 18,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 7,
  },
  headerSide: {
    width: 135,
  },
  logo: {
    width: 132,
    height: 38,
    objectFit: "contain",
    objectPosition: "left center",
  },
  documentTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: "#111111",
  },
  customerGrid: {
    flexDirection: "row",
    marginBottom: 11,
  },
  customerPanel: {
    flex: 1,
    paddingRight: 10,
  },
  metaPanel: {
    width: 170,
  },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textDecoration: "underline",
    marginBottom: 3,
  },
  strong: {
    fontFamily: "Helvetica-Bold",
  },
  infoLine: {
    minHeight: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    paddingBottom: 1,
    marginBottom: 1,
  },
  codeBox: {
    minHeight: 28,
    borderWidth: 1,
    borderColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Helvetica-Oblique",
    fontSize: 9,
    marginBottom: 6,
    padding: 4,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    width: 58,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    flex: 1,
  },
  greeting: {
    marginBottom: 8,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    borderLeftWidth: 0.5,
    borderLeftColor: "#6b7280",
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    minHeight: 27,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    backgroundColor: "#f9fafb",
  },
  sectionRow: {
    borderRightWidth: 0.5,
    borderRightColor: "#6b7280",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    paddingVertical: 3,
    paddingHorizontal: 3,
    backgroundColor: "#f3f4f6",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.4,
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 22,
    borderBottomWidth: 0.6,
    borderBottomColor: "#374151",
  },
  th: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: "#6b7280",
    fontFamily: "Helvetica-Bold",
    fontSize: 5.6,
    textAlign: "center",
    justifyContent: "center",
  },
  td: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: "#6b7280",
    fontSize: 5.7,
    lineHeight: 1.3,
  },
  tdCenter: {
    textAlign: "center",
  },
  tdRight: {
    textAlign: "right",
  },
  wNo: { width: "3.5%" },
  wDescription: { width: "10%" },
  wLocation: { width: "13%" },
  wRegulation: { width: "13%" },
  wParameter: { width: "18%" },
  wMethod: { width: "18%" },
  wDuration: { width: "7%" },
  wQty: { width: "4.5%" },
  wPrice: { width: "6.5%" },
  wTotal: { width: "6.5%" },
  summaryGrid: {
    flexDirection: "row",
    marginTop: 10,
    minPresenceAhead: 92,
  },
  paymentPanel: {
    flex: 1,
    paddingRight: 18,
  },
  paymentText: {
    marginBottom: 2,
  },
  totalsPanel: {
    width: 190,
  },
  totalRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    paddingVertical: 3,
  },
  totalLabel: {
    flex: 1,
    textAlign: "right",
    paddingRight: 8,
  },
  totalValue: {
    width: 78,
    textAlign: "right",
  },
  grandTotalRow: {
    backgroundColor: "#6b7280",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 0,
  },
  finalPage: {
    marginTop: 0,
  },
  logisticsGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  logisticsPanel: {
    flex: 1,
    paddingRight: 12,
  },
  emailPanel: {
    width: 155,
  },
  termsHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textDecoration: "underline",
    marginBottom: 4,
  },
  termRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  termNo: {
    width: 13,
    textAlign: "right",
    paddingRight: 4,
  },
  termText: {
    flex: 1,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 12,
  },
  signatureBox: {
    width: "30%",
    textAlign: "center",
  },
  signatureSpace: {
    height: 42,
  },
  signatureLine: {
    borderTopWidth: 0.7,
    borderTopColor: "#111827",
    paddingTop: 2,
    fontFamily: "Helvetica-Bold",
  },
  corporateBlock: {
    borderTopWidth: 2,
    borderTopColor: "#315b8c",
    paddingTop: 7,
    color: "#315b8c",
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 4,
  },
  corporateColumns: {
    flexDirection: "row",
  },
  corporateColumn: {
    flex: 1,
    paddingRight: 12,
  },
  footerLeft: {
    position: "absolute",
    left: 18,
    bottom: 12,
    color: "#4b5563",
    fontSize: 5.8,
  },
  footerRight: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    paddingRight: 18,
    color: "#4b5563",
    fontSize: 5.8,
    textAlign: "right",
  },
});

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveInteger(value: unknown, fallback = 1) {
  const parsed = numberOrNull(value);
  if (parsed === null || parsed <= 0) return fallback;
  return Math.max(1, Math.round(parsed));
}

function positiveNumber(value: unknown, fallback = 1) {
  const parsed = numberOrNull(value);
  return parsed !== null && parsed > 0 ? parsed : fallback;
}

function formatAmount(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function textOrDash(value: unknown) {
  if (typeof value !== "string") return "—";
  return value.trim() || "—";
}

function compactLines(values: Array<unknown>) {
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || result.includes(normalized)) continue;
    result.push(normalized);
  }

  return result.join("\n") || "—";
}

function alignedLines(values: Array<unknown>) {
  if (values.length === 0) return "—";

  return values
    .map((value) =>
      typeof value === "string" && value.trim() ? value.trim() : "—"
    )
    .join("\n");
}

function addressText(...values: Array<unknown>) {
  return values
    .filter((value): value is string =>
      typeof value === "string" && value.trim().length > 0
    )
    .map((value) => value.trim())
    .join(", ") || "—";
}

function itemParameterName(item: any) {
  const name =
    item.displayName ||
    item.regulationParameter?.displayName ||
    item.parameter?.name ||
    item.description ||
    "—";
  const accredited =
    item.isAccredited ?? item.regulationParameter?.isAccredited ?? true;

  return accredited === false && !String(name).trim().endsWith("*")
    ? `${name}*`
    : String(name);
}

function groupUsesPackagePricing(group: any) {
  if (group.pricingMode === "PACKAGE") return true;
  if (group.pricingMode === "ITEM") return false;

  // Kompatibilitas payload lama/non-Prisma yang belum mempunyai pricingMode.
  return (
    Object.prototype.hasOwnProperty.call(group, "unitPrice") ||
    group.packagePrice !== undefined
  );
}

function groupUnitPrice(group: any, items: any[]) {
  if (groupUsesPackagePricing(group)) {
    return numberOrNull(
      group.unitPrice ?? group.packagePrice ?? group.price
    );
  }

  const prices = items.map((item) => numberOrNull(item.price));
  if (prices.length === 0 || prices.some((price) => price === null)) return null;
  return (prices as number[]).reduce((sum, price) => sum + price, 0);
}

function buildTestingLines(quotation: any): TestingLine[] {
  if (Array.isArray(quotation.groups) && quotation.groups.length > 0) {
    return quotation.groups.map((group: any, index: number) => {
      const items = Array.isArray(group.items) ? group.items : [];
      const qty = positiveInteger(group.qty);
      const unitPrice = groupUnitPrice(group, items);
      const locations = Array.isArray(group.locations)
        ? group.locations.map((location: any) => {
            const label = textOrDash(location.label);
            const sampleId =
              typeof location.customerSampleId === "string"
                ? location.customerSampleId.trim()
                : "";
            return sampleId ? `${sampleId} / ${label}` : label;
          })
        : [];
      const groupRegulation =
        group.regulation?.shortName ||
        group.regulation?.name ||
        group.regulationName ||
        group.matrix?.name;
      const linkedRegulations = Array.isArray(group.regulationLinks)
        ? group.regulationLinks.map(
            (link: any) =>
              link.regulation?.shortName || link.regulation?.name
          )
        : [];

      return {
        key: String(group.id || `group-${index}`),
        description: textOrDash(
          group.description || group.matrix?.name || group.note
        ),
        locations: compactLines(locations),
        regulations: compactLines([
          groupRegulation,
          ...linkedRegulations,
          ...items.map(
            (item: any) =>
              item.regulationMatrix ||
              item.regulationParameter?.regulation?.shortName ||
              item.regulationParameter?.regulation?.name
          ),
        ]),
        parameters: alignedLines(items.map(itemParameterName)),
        methods: alignedLines(
          items.map(
            (item: any) =>
              item.method ||
              item.regulationParameter?.method ||
              item.parameter?.method
          )
        ),
        durations: alignedLines(
          items.map(
            (item: any) =>
              item.durationSampling || item.duration?.label || item.durationLabel
          )
        ),
        qty,
        unitPrice,
        total: unitPrice === null ? null : unitPrice * qty,
      };
    });
  }

  const legacyItems = Array.isArray(quotation.items) ? quotation.items : [];
  return legacyItems.map((item: any, index: number) => {
    const qty = positiveNumber(item.qty);
    const unitPrice = numberOrNull(item.price);

    return {
      key: String(item.id || `item-${index}`),
      description: textOrDash(item.description || item.parameter?.name),
      locations: compactLines([
        item.customerSampleId,
        item.samplingLocation,
      ]),
      regulations: textOrDash(item.regulationMatrix),
      parameters: itemParameterName(item),
      methods: textOrDash(item.method || item.parameter?.method),
      durations: textOrDash(
        item.durationSampling || item.duration?.label
      ),
      qty,
      unitPrice,
      total: unitPrice === null ? null : unitPrice * qty,
    };
  });
}

function normalizeChargeCategory(value: unknown): ChargeCategory {
  const category = typeof value === "string" ? value.toUpperCase() : "OTHER";
  if (category === "SAMPLING" || category === "DOCUMENT") return category;
  return "OTHER";
}

function buildChargeLines(quotation: any): ChargeLine[] {
  const raw = Array.isArray(quotation.chargeItems)
    ? quotation.chargeItems
    : [];

  const lines: ChargeLine[] = raw.map((item: any, index: number) => {
    const qty = positiveInteger(item.qty);
    const explicitTotal = numberOrNull(item.total ?? item.totalAmount);
    const unitPrice = numberOrNull(item.unitPrice ?? item.price);

    return {
      key: String(item.id || `charge-${index}`),
      category: normalizeChargeCategory(item.category || item.type),
      description: compactLines([
        item.description || item.name,
        item.detail,
        item.unit ? `Satuan: ${item.unit}` : null,
      ]),
      qty,
      unitPrice,
      total:
        explicitTotal ?? (unitPrice === null ? null : unitPrice * qty),
    };
  });

  const hasSampling = lines.some((line) => line.category === "SAMPLING");
  const samplingCost = numberOrNull(quotation.samplingCost);
  if (!hasSampling && samplingCost !== null && samplingCost > 0) {
    lines.push({
      key: "legacy-sampling-cost",
      category: "SAMPLING",
      description: "Biaya sampling",
      qty: 1,
      unitPrice: samplingCost,
      total: samplingCost,
    });
  }

  const hasDocument = lines.some((line) => line.category === "DOCUMENT");
  const documentCost = numberOrNull(quotation.documentCost);
  if (!hasDocument && documentCost !== null && documentCost > 0) {
    lines.push({
      key: "legacy-document-cost",
      category: "DOCUMENT",
      description: "Biaya dokumen",
      qty: 1,
      unitPrice: documentCost,
      total: documentCost,
    });
  }

  const hasAdditional = lines.some(
    (line) => line.category === "DOCUMENT" || line.category === "OTHER"
  );
  const additionalCost = numberOrNull(quotation.additionalCost);
  if (!hasAdditional && additionalCost !== null && additionalCost > 0) {
    lines.push({
      key: "legacy-additional-cost",
      category: "OTHER",
      description: "Biaya tambahan",
      qty: 1,
      unitPrice: additionalCost,
      total: additionalCost,
    });
  }

  return lines;
}

const TAT_DAYS: Record<string, number> = {
  NORMAL: 10,
  URGENT: 7,
  TOP_URGENT: 5,
};

const TAT_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  TOP_URGENT: "Top Urgent",
};

function resolveTat(quotation: any) {
  const requested =
    typeof quotation.tatRequested === "string"
      ? quotation.tatRequested.toUpperCase()
      : "NORMAL";

  return {
    days: TAT_DAYS[requested] || 10,
    label: TAT_LABELS[requested] || "Normal",
  };
}

function customTerms(quotation: any) {
  const raw = Array.isArray(quotation.terms)
    ? quotation.terms
    : Array.isArray(quotation.termItems)
      ? quotation.termItems
      : null;

  if (!raw) return null;

  const terms = raw
    .map((entry: any) =>
      typeof entry === "string" ? entry.trim() : entry?.text?.trim()
    )
    .filter((entry: unknown): entry is string =>
      typeof entry === "string" && entry.length > 0
    );

  return terms.length > 0 ? terms : null;
}

function buildTerms(
  quotation: any,
  config: QuotationDocumentConfig
): string[] {
  const supplied = customTerms(quotation);
  if (supplied) return supplied;

  const tat = resolveTat(quotation);
  const terms = [
    "Parameter tidak terakreditasi ditandai dengan *.",
  ];

  if (config.minimumOrder !== null) {
    terms.push(
      `Minimum order IDR ${formatAmount(config.minimumOrder)}.`
    );
  }

  terms.push(
    "Purchase Order (PO), Surat Perintah Kerja (SPK), atau persetujuan quotation diperlukan sebelum pekerjaan dijadwalkan.",
    "Jadwal sampling diinformasikan setelah dokumen persetujuan diterima.",
    "Pelanggan menyediakan akses, fasilitas penunjang, dan kondisi lokasi yang aman untuk proses sampling.",
    `Hasil pengujian ditargetkan selesai ${tat.days} hari kerja (${tat.label}) setelah sampel diterima dan dinyatakan memenuhi persyaratan.`,
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

function TestingTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.th, styles.wNo]}>No.</Text>
      <Text style={[styles.th, styles.wDescription]}>Deskripsi</Text>
      <Text style={[styles.th, styles.wLocation]}>
        Customer Sample{"\n"}ID/Location
      </Text>
      <Text style={[styles.th, styles.wRegulation]}>Regulasi (Matriks)</Text>
      <Text style={[styles.th, styles.wParameter]}>Parameter Uji</Text>
      <Text style={[styles.th, styles.wMethod]}>Metode</Text>
      <Text style={[styles.th, styles.wDuration]}>Durasi Sampling</Text>
      <Text style={[styles.th, styles.wQty]}>Qty</Text>
      <Text style={[styles.th, styles.wPrice]}>Harga</Text>
      <Text style={[styles.th, styles.wTotal]}>Total</Text>
    </View>
  );
}

function TestingRow({ line, index }: { line: TestingLine; index: number }) {
  return (
    <View style={styles.tableRow} wrap={false}>
      <Text style={[styles.td, styles.tdCenter, styles.wNo]}>{index + 1}</Text>
      <Text style={[styles.td, styles.wDescription]}>{line.description}</Text>
      <Text style={[styles.td, styles.wLocation]}>{line.locations}</Text>
      <Text style={[styles.td, styles.wRegulation]}>{line.regulations}</Text>
      <Text style={[styles.td, styles.wParameter]}>{line.parameters}</Text>
      <Text style={[styles.td, styles.wMethod]}>{line.methods}</Text>
      <Text style={[styles.td, styles.tdCenter, styles.wDuration]}>
        {line.durations}
      </Text>
      <Text style={[styles.td, styles.tdCenter, styles.wQty]}>{line.qty}</Text>
      <Text style={[styles.td, styles.tdRight, styles.wPrice]}>
        {formatAmount(line.unitPrice)}
      </Text>
      <Text style={[styles.td, styles.tdRight, styles.wTotal]}>
        {formatAmount(line.total)}
      </Text>
    </View>
  );
}

function ChargeRow({ line, index }: { line: ChargeLine; index: number }) {
  return (
    <View style={styles.tableRow} wrap={false}>
      <Text style={[styles.td, styles.tdCenter, styles.wNo]}>{index + 1}</Text>
      <Text
        style={[
          styles.td,
          { width: "68.5%" },
        ]}
      >
        {line.description}
      </Text>
      <Text style={[styles.td, styles.tdCenter, styles.wQty]}>{line.qty}</Text>
      <Text style={[styles.td, styles.tdRight, styles.wPrice]}>
        {formatAmount(line.unitPrice)}
      </Text>
      <Text style={[styles.td, styles.tdRight, styles.wTotal]}>
        {formatAmount(line.total)}
      </Text>
    </View>
  );
}

function InfoPanel({
  heading,
  company,
  address,
  contact,
  phone,
  email,
}: {
  heading: string;
  company: string;
  address: string;
  contact: string;
  phone: string;
  email?: string;
}) {
  return (
    <View style={styles.customerPanel}>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={[styles.infoLine, styles.strong]}>{company}</Text>
      <Text style={styles.infoLine}>{address}</Text>
      <Text style={styles.infoLine}>
        CP. {contact} · Ph. {phone}
      </Text>
      {email ? <Text style={styles.infoLine}>Email. {email}</Text> : null}
    </View>
  );
}

export default function QuotationPdf({
  quotation,
  logoSrc,
}: QuotationPdfProps) {
  const config = getQuotationDocumentConfig();
  const customer = quotation.customer || {};
  const testingLines = buildTestingLines(quotation);
  const chargeLines = buildChargeLines(quotation);
  const terms = buildTerms(quotation, config);

  const testingCalculated = testingLines.reduce(
    (sum, line) => sum + (line.total ?? 0),
    0
  );
  const testingTotal = testingCalculated;
  const chargesTotal = chargeLines.reduce(
    (sum, line) => sum + (line.total ?? 0),
    0
  );
  const commercialLines = [...testingLines, ...chargeLines];
  const fullyPriced =
    commercialLines.length > 0 &&
    commercialLines.every((line) => line.total !== null);
  const subtotal = testingTotal + chargesTotal;
  const discountPercent = numberOrNull(quotation.discountPercent) ?? 0;
  const discountAmount =
    numberOrNull(quotation.discountAmount) ??
    (discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0);
  const tatSurcharge = numberOrNull(quotation.tatSurchargeAmount) ?? 0;
  const vatPercent = numberOrNull(quotation.vatPercent) ?? 0;
  const taxableAmount = Math.max(
    0,
    subtotal - discountAmount + tatSurcharge
  );
  const vatAmount = (taxableAmount * vatPercent) / 100;
  const grandTotal = taxableAmount + vatAmount;

  const samplingLines = chargeLines.filter(
    (line) => line.category === "SAMPLING"
  );
  const documentLines = chargeLines.filter(
    (line) => line.category === "DOCUMENT"
  );
  const otherLines = chargeLines.filter(
    (line) => line.category === "OTHER"
  );

  const primaryCompany = textOrDash(customer.company || customer.name);
  const primaryAddress = addressText(
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.province
  );
  const primaryContact = textOrDash(customer.contactPerson);
  const primaryPhone = textOrDash(customer.phone);
  const primaryEmail = textOrDash(customer.email);

  const recipientEmails = [
    customer.recipientEmail1 || customer.email,
    customer.recipientEmail2,
    customer.recipientEmail3,
    customer.recipientEmail4,
  ].map((email, index) => `${index + 1}) ${textOrDash(email)}`);

  const requesterName = textOrDash(
    quotation.requestedBy?.name ||
      quotation.requestedByName ||
      quotation.salesOfficerName ||
      "Sales Officer"
  );
  const approverName = textOrDash(
    quotation.approvedBy?.name ||
      quotation.approvedByName ||
      quotation.managerName ||
      "Marketing & Sales Manager"
  );
  const customerSigner = textOrDash(
    quotation.customerSignerName || customer.contactPerson || "Pelanggan"
  );

  const paymentLines = [
    config.bankName,
    config.bankAccountName
      ? `A/n. ${config.bankAccountName}`
      : null,
    config.bankAccountNumber
      ? `No. Rekening ${config.bankAccountNumber}`
      : null,
  ].filter((line): line is string => Boolean(line));

  const corporateContact = [
    config.companyPhone ? `Telp. ${config.companyPhone}` : null,
    config.companyFax ? `Fax. ${config.companyFax}` : null,
    config.companyEmail,
    config.companyWebsite,
  ].filter((line): line is string => Boolean(line));

  return (
    <Document
      title={`Surat Penawaran ${quotation.quotationNo || ""}`.trim()}
      author={config.companyName}
      subject="Surat Penawaran Pengujian"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.runningHeader} fixed>
          <View style={styles.headerSide}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>
          <Text style={styles.documentTitle}>SURAT PENAWARAN</Text>
          <View style={styles.headerSide} />
        </View>

        <Text style={styles.footerLeft} fixed>
          {config.formCode}; {config.formRevision}; {config.formEffectiveDate}
        </Text>
        <Text
          style={styles.footerRight}
          fixed
        >
          Dokumen terkendali
        </Text>
        <View style={styles.customerGrid}>
          <InfoPanel
            heading="INFORMASI PELANGGAN"
            company={primaryCompany}
            address={primaryAddress}
            contact={primaryContact}
            phone={primaryPhone}
            email={primaryEmail}
          />

          <InfoPanel
            heading="INFORMASI PENAGIHAN"
            company={textOrDash(
              customer.billingCompany || customer.company || customer.name
            )}
            address={addressText(
              customer.billingAddressLine1 || customer.addressLine1,
              customer.billingAddressLine2 || customer.addressLine2
            )}
            contact={textOrDash(
              customer.billingContactPerson || customer.contactPerson
            )}
            phone={textOrDash(customer.billingPhone || customer.phone)}
            email={textOrDash(customer.billingEmail || customer.email)}
          />

          <View style={styles.metaPanel}>
            <Text style={styles.codeBox}>
              {textOrDash(customer.customerCode)}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>No. Penawaran</Text>
              <Text style={styles.metaValue}>
                {textOrDash(quotation.quotationNo)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Tanggal</Text>
              <Text style={styles.metaValue}>
                {formatDate(quotation.quotationDate)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Berlaku Hingga</Text>
              <Text style={styles.metaValue}>
                {formatDate(quotation.validUntil)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text>Kepada pelanggan yang terhormat,</Text>
          <Text>
            Bersama ini kami sampaikan penawaran harga sebagai berikut:
          </Text>
          {quotation.note ? <Text>Catatan: {quotation.note}</Text> : null}
        </View>

        <View style={styles.table}>
          <TestingTableHeader />
          <Text style={styles.sectionRow}>
            {textOrDash(
              quotation.testingSectionTitle ||
                quotation.scopeTitle ||
                "A. Pengujian Laboratorium"
            )}
          </Text>
          {testingLines.length > 0 ? (
            testingLines.map((line, index) => (
              <TestingRow key={line.key} line={line} index={index} />
            ))
          ) : (
            <Text style={styles.sectionRow}>Belum ada paket pengujian.</Text>
          )}

          {samplingLines.length > 0 ? (
            <>
              <Text style={styles.sectionRow}>B. Sampling</Text>
              {samplingLines.map((line, index) => (
                <ChargeRow key={line.key} line={line} index={index} />
              ))}
            </>
          ) : null}

          {documentLines.length > 0 ? (
            <>
              <Text style={styles.sectionRow}>C. Dokumen</Text>
              {documentLines.map((line, index) => (
                <ChargeRow key={line.key} line={line} index={index} />
              ))}
            </>
          ) : null}

          {otherLines.length > 0 ? (
            <>
              <Text style={styles.sectionRow}>D. Biaya Lain-lain</Text>
              {otherLines.map((line, index) => (
                <ChargeRow key={line.key} line={line} index={index} />
              ))}
            </>
          ) : null}
        </View>

        <View style={styles.summaryGrid} wrap={false}>
          <View style={styles.paymentPanel}>
            <Text style={styles.heading}>INFORMASI PEMBAYARAN</Text>
            {paymentLines.length > 0 ? (
              paymentLines.map((line) => (
                <Text key={line} style={styles.paymentText}>
                  {line}
                </Text>
              ))
            ) : (
              <Text style={styles.paymentText}>
                Informasi rekening disampaikan oleh tim Medialab.
              </Text>
            )}
          </View>

          <View style={styles.totalsPanel}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sub Total</Text>
              <Text style={styles.totalValue}>
                {formatAmount(fullyPriced ? subtotal : null)}
              </Text>
            </View>
            {discountAmount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {textOrDash(quotation.discountLabel || "Diskon")}
                  {discountPercent > 0 ? ` ${discountPercent}%` : ""}
                </Text>
                <Text style={styles.totalValue}>
                  -{formatAmount(discountAmount)}
                </Text>
              </View>
            ) : null}
            {tatSurcharge > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Biaya percepatan TAT</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(tatSurcharge)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>PPN {vatPercent}%</Text>
              <Text style={styles.totalValue}>
                {formatAmount(fullyPriced ? vatAmount : null)}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.totalLabel}>TOTAL (IDR)</Text>
              <Text style={styles.totalValue}>
                {formatAmount(fullyPriced ? grandTotal : null)}
              </Text>
            </View>
          </View>
        </View>

        <View break style={styles.finalPage}>
          <View style={styles.logisticsGrid}>
            <View style={styles.logisticsPanel}>
              <Text style={styles.heading}>LOKASI SAMPLING</Text>
              <Text style={[styles.infoLine, styles.strong]}>
                {textOrDash(
                  customer.samplingCompany || customer.company || customer.name
                )}
              </Text>
              <Text style={styles.infoLine}>
                {addressText(
                  customer.samplingAddressLine1 || customer.addressLine1,
                  customer.samplingAddressLine2 || customer.addressLine2
                )}
              </Text>
              <Text style={styles.infoLine}>
                CP. {textOrDash(
                  customer.samplingContactPerson || customer.contactPerson
                )} · Ph. {textOrDash(customer.samplingPhone || customer.phone)}
              </Text>
            </View>

            <View style={styles.logisticsPanel}>
              <Text style={styles.heading}>ALAMAT PENGIRIMAN DOKUMEN</Text>
              <Text style={[styles.infoLine, styles.strong]}>
                {textOrDash(
                  customer.documentCompany || customer.company || customer.name
                )}
              </Text>
              <Text style={styles.infoLine}>
                {addressText(
                  customer.documentAddressLine1 || customer.addressLine1,
                  customer.documentAddressLine2 || customer.addressLine2
                )}
              </Text>
              <Text style={styles.infoLine}>
                CP. {textOrDash(
                  customer.documentContactPerson || customer.contactPerson
                )} · Ph. {textOrDash(customer.documentPhone || customer.phone)}
              </Text>
            </View>

            <View style={styles.emailPanel}>
              <Text style={styles.heading}>EMAIL PENERIMA</Text>
              {recipientEmails.map((email) => (
                <Text key={email} style={styles.infoLine}>
                  {email}
                </Text>
              ))}
            </View>
          </View>

          <Text style={styles.termsHeading}>Syarat dan Ketentuan</Text>
          {terms.map((term: string, index: number) => (
            <View key={`${index}-${term}`} style={styles.termRow} wrap={false}>
              <Text style={styles.termNo}>{index + 1}</Text>
              <Text style={styles.termText}>{term}</Text>
            </View>
          ))}

          <View style={styles.signatures} wrap={false}>
            <View style={styles.signatureBox}>
              <Text>Dibuat Oleh,</Text>
              <Text>Sales Officer</Text>
              <View style={styles.signatureSpace} />
              <Text style={styles.signatureLine}>{requesterName}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text>Diketahui Oleh,</Text>
              <Text>Marketing & Sales Manager</Text>
              <View style={styles.signatureSpace} />
              <Text style={styles.signatureLine}>{approverName}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text>Disetujui Oleh,</Text>
              <Text>Pelanggan</Text>
              <View style={styles.signatureSpace} />
              <Text style={styles.signatureLine}>{customerSigner}</Text>
              <Text>Tgl. __________________</Text>
            </View>
          </View>

          <View style={styles.corporateBlock} wrap={false}>
            <Text style={styles.companyName}>{config.companyName}</Text>
            <View style={styles.corporateColumns}>
              <View style={styles.corporateColumn}>
                <Text style={styles.strong}>Head Office & Laboratory</Text>
                <Text>
                  {config.companyAddress ||
                    "Alamat perusahaan mengikuti konfigurasi deployment."}
                </Text>
              </View>
              <View style={styles.corporateColumn}>
                {corporateContact.length > 0 ? (
                  corporateContact.map((line) => (
                    <Text key={line}>{line}</Text>
                  ))
                ) : (
                  <Text>
                    Kontak perusahaan mengikuti konfigurasi deployment.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
