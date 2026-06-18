import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatDate, tatLabel } from "@/lib/exports/format";

type Props = {
  logoSrc?: string | null;
  coc: any;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 26,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 10,
    marginBottom: 12,
  },
  logo: {
    width: 150,
    height: 42,
  },
  headerRight: {
    marginLeft: "auto",
    textAlign: "right",
  },
  title: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 2,
  },
  section: {
    marginTop: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 7,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#047857",
    marginBottom: 7,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  col: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    color: "#64748b",
    fontSize: 7.2,
    marginBottom: 1,
  },
  value: {
    color: "#0f172a",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.25,
  },
  normalValue: {
    color: "#0f172a",
    fontSize: 8,
    lineHeight: 1.25,
  },

  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 3,
    fontSize: 6.5,
    lineHeight: 1.15,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  td: {
    paddingVertical: 5,
    paddingHorizontal: 3,
    fontSize: 6.5,
    lineHeight: 1.18,
    color: "#0f172a",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  noBorderRight: {
    borderRightWidth: 0,
  },

  wNo: { width: "4%" },
  wLab: { width: "10%" },
  wArea: { width: "18%" },
  wMatrix: { width: "16%" },
  wParam: { width: "18%" },
  wMethod: { width: "13%" },
  wDuration: { width: "8%" },
  wSamplingDate: { width: "7%" },
  wLoginDate: { width: "6%" },

  signatureWrapper: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "30%",
    textAlign: "center",
  },
  signatureSpace: {
    height: 42,
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 6.3,
  },
});

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateShort(value?: string | Date | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function getItemLocation(item: any, coc: any, customer: any) {
  return item.samplingLocation || getSamplingLocation(coc, customer);
}

function getItemMethod(item: any) {
  return item.method || item.parameter?.method || "-";
}

function getSamplingDate(coc: any) {
  return coc.plannedSamplingStart || coc.plannedSamplingEnd || null;
}

function getLoginDate(coc: any) {
  return coc.createdAt || null;
}

export default function CocPdf({ coc, logoSrc }: Props) {
  const quotation = coc.quotation;
  const customer = quotation.customer;
  const samplingDate = getSamplingDate(coc);
  const loginDate = getLoginDate(coc);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>CHAIN OF CUSTODY</Text>
            <Text style={styles.subtitle}>COC No: {coc.cocNo}</Text>
            <Text style={styles.subtitle}>
              Quotation: {quotation.quotationNo}
            </Text>
            <Text style={styles.subtitle}>
              LTR: {quotation.ltr?.ltrNo || "-"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Sampling Information</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Customer / Company</Text>
              <Text style={styles.value}>
                {customer.company || customer.name || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Contact Person</Text>
              <Text style={styles.value}>{customer.contactPerson || "-"}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Customer Email COA</Text>
              <Text style={styles.value}>
                {coc.customerEmailCoa || customer.recipientEmail1 || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Customer Code</Text>
              <Text style={styles.value}>{coc.customerCode || "-"}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Default Sampling Location</Text>
              <Text style={styles.value}>
                {getSamplingLocation(coc, customer)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Sampler Name</Text>
              <Text style={styles.value}>{coc.samplerName || "-"}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>TAT Requested</Text>
              <Text style={styles.value}>{tatLabel(coc.tatRequested)}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Delivery Method</Text>
              <Text style={styles.value}>
                {deliveryMethodLabel(coc.deliveryMethod)}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Sample No</Text>
              <Text style={styles.value}>
                {coc.sample?.sampleNo ||
                  quotation.samples?.[0]?.sampleNo ||
                  "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Planned Sampling Start</Text>
              <Text style={styles.value}>
                {formatDateTime(coc.plannedSamplingStart)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Planned Sampling End</Text>
              <Text style={styles.value}>
                {formatDateTime(coc.plannedSamplingEnd)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Estimated COA Date</Text>
              <Text style={styles.value}>
                {formatDate(coc.estimatedCoaDate)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Condition & Instruction</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Sampling Info</Text>
              <Text style={styles.normalValue}>
                {coc.sampleConditionSamplingInfo || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Method</Text>
              <Text style={styles.normalValue}>
                {coc.sampleConditionMethod || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Received Condition</Text>
              <Text style={styles.normalValue}>
                {coc.sampleConditionReceived || "-"}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Abnormal Condition</Text>
              <Text style={styles.normalValue}>
                {coc.abnormalCondition || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Special Instruction</Text>
              <Text style={styles.normalValue}>
                {coc.specialInstruction || "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wNo]}>No</Text>
            <Text style={[styles.th, styles.wLab]}>No. Lab</Text>
            <Text style={[styles.th, styles.wArea]}>Area Sampling</Text>
            <Text style={[styles.th, styles.wMatrix]}>Regulasi / Matrix</Text>
            <Text style={[styles.th, styles.wParam]}>Parameter Uji</Text>
            <Text style={[styles.th, styles.wMethod]}>Metode</Text>
            <Text style={[styles.th, styles.wDuration]}>Durasi Sampling</Text>
            <Text style={[styles.th, styles.wSamplingDate]}>Tanggal Sampling</Text>
            <Text style={[styles.th, styles.wLoginDate, styles.noBorderRight]}>
              Tanggal Login
            </Text>
          </View>

          {quotation.items.map((item: any, index: number) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.wNo]}>{index + 1}</Text>

              <Text style={[styles.td, styles.wLab]}>
                {item.customerSampleId || "-"}
              </Text>

              <Text style={[styles.td, styles.wArea]}>
                {getItemLocation(item, coc, customer)}
              </Text>

              <Text style={[styles.td, styles.wMatrix]}>
                {item.regulationMatrix || "-"}
              </Text>

              <Text style={[styles.td, styles.wParam]}>
                {item.description || item.parameter?.name || "-"}
              </Text>

              <Text style={[styles.td, styles.wMethod]}>
                {getItemMethod(item)}
              </Text>

              <Text style={[styles.td, styles.wDuration]}>
                {item.durationSampling || "-"}
              </Text>

              <Text style={[styles.td, styles.wSamplingDate]}>
                {formatDateShort(samplingDate)}
              </Text>

              <Text style={[styles.td, styles.wLoginDate, styles.noBorderRight]}>
                {formatDateShort(loginDate)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.signatureWrapper}>
          <View style={styles.signatureBox}>
            <Text>Sampler,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>{coc.samplerName || "Sampler"}</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>Received by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Lab Admin</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>Customer,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>
              {customer.contactPerson || "Customer"}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>LIMS-Medialab - Chain of Custody</Text>
          <Text>Generated from system</Text>
        </View>
      </Page>
    </Document>
  );
}