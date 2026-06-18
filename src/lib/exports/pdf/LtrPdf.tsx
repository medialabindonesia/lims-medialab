import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  formatDate,
  formatRupiah,
  samplingByLabel,
  tatLabel,
  testingObjectiveLabel,
} from "@/lib/exports/format";

type Props = {
  logoSrc?: string | null;
  ltr: any;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 30,
    fontSize: 8.5,
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
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 2,
  },
  centerTitle: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    textDecoration: "underline",
  },
  centerNo: {
    textAlign: "center",
    fontSize: 9,
    marginBottom: 12,
  },
  paragraph: {
    lineHeight: 1.45,
    marginBottom: 8,
    textAlign: "justify",
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
    fontSize: 7.5,
    marginBottom: 1,
  },
  value: {
    color: "#0f172a",
    fontSize: 8.2,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.25,
  },
  normalValue: {
    color: "#0f172a",
    fontSize: 8.2,
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
    paddingHorizontal: 4,
    fontSize: 7,
    lineHeight: 1.15,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  td: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 7,
    lineHeight: 1.2,
    color: "#0f172a",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  noBorderRight: {
    borderRightWidth: 0,
  },

  wNo: { width: "4%" },
  wParam: { width: "22%" },
  wSample: { width: "12%" },
  wLocation: { width: "18%" },
  wMatrix: { width: "18%" },
  wDuration: { width: "10%" },
  wMethod: { width: "16%" },

  signatureWrapper: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBox: {
    width: 220,
    textAlign: "center",
  },
  signatureSpace: {
    height: 52,
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 6.5,
  },
});

function getItemLocation(item: any, quotation: any) {
  return (
    item.samplingLocation ||
    quotation.coc?.samplingLocation ||
    quotation.customer?.samplingCompany ||
    "-"
  );
}

function getItemMethod(item: any) {
  return item.method || item.parameter?.method || "-";
}

export default function LtrPdf({ ltr, logoSrc }: Props) {
  const quotation = ltr.quotation;
  const customer = quotation.customer;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>LETTER OF TESTING REQUEST</Text>
            <Text style={styles.subtitle}>LTR No: {ltr.ltrNo}</Text>
            <Text style={styles.subtitle}>
              Quotation: {quotation.quotationNo}
            </Text>
            <Text style={styles.subtitle}>
              Date: {formatDate(ltr.createdAt)}
            </Text>
          </View>
        </View>

        <Text style={styles.centerTitle}>LETTER OF TESTING REQUEST</Text>
        <Text style={styles.centerNo}>Nomor: {ltr.ltrNo}</Text>

        <Text style={styles.paragraph}>
          Dokumen ini diterbitkan sebagai dasar pelaksanaan pekerjaan pengujian
          laboratorium berdasarkan quotation yang telah disetujui dan purchase
          order yang telah diterima.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>

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
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{customer.email || "-"}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{customer.phone || "-"}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Sampling Company</Text>
              <Text style={styles.normalValue}>
                {customer.samplingCompany || customer.company || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Sampling Address</Text>
              <Text style={styles.normalValue}>
                {[customer.samplingAddressLine1, customer.samplingAddressLine2]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Document Receiver</Text>
              <Text style={styles.normalValue}>
                {customer.documentCompany || customer.company || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>COA Recipient Email</Text>
              <Text style={styles.normalValue}>
                {customer.recipientEmail1 || customer.email || "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing Request Detail</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Template COA</Text>
              <Text style={styles.value}>
                {quotation.coaTemplate?.name || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Purchase Order</Text>
              <Text style={styles.value}>
                {quotation.purchaseOrder?.poNumber || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Sampling By</Text>
              <Text style={styles.value}>
                {samplingByLabel(quotation.samplingBy)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>TAT Requested</Text>
              <Text style={styles.value}>{tatLabel(quotation.tatRequested)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Testing Objective</Text>
              <Text style={styles.normalValue}>
                {testingObjectiveLabel(quotation.testingObjective)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Quotation Date</Text>
              <Text style={styles.normalValue}>
                {formatDate(quotation.quotationDate)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Valid Until</Text>
              <Text style={styles.normalValue}>
                {formatDate(quotation.validUntil)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Grand Total</Text>
              <Text style={styles.value}>
                {formatRupiah(quotation.grandTotal || quotation.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wNo]}>No</Text>
            <Text style={[styles.th, styles.wParam]}>Parameter</Text>
            <Text style={[styles.th, styles.wSample]}>Sample ID</Text>
            <Text style={[styles.th, styles.wLocation]}>Sampling Location</Text>
            <Text style={[styles.th, styles.wMatrix]}>Matrix / Regulation</Text>
            <Text style={[styles.th, styles.wDuration]}>Duration</Text>
            <Text style={[styles.th, styles.wMethod, styles.noBorderRight]}>
              Method
            </Text>
          </View>

          {quotation.items.map((item: any, index: number) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.wNo]}>{index + 1}</Text>

              <Text style={[styles.td, styles.wParam]}>
                {item.description || item.parameter?.name || "-"}
              </Text>

              <Text style={[styles.td, styles.wSample]}>
                {item.customerSampleId || "-"}
              </Text>

              <Text style={[styles.td, styles.wLocation]}>
                {getItemLocation(item, quotation)}
              </Text>

              <Text style={[styles.td, styles.wMatrix]}>
                {item.regulationMatrix || "-"}
              </Text>

              <Text style={[styles.td, styles.wDuration]}>
                {item.durationSampling || "-"}
              </Text>

              <Text style={[styles.td, styles.wMethod, styles.noBorderRight]}>
                {getItemMethod(item)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.signatureWrapper}>
          <View style={styles.signatureBox}>
            <Text>Issued by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Sales / Authorized Person</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>LIMS-Medialab - Letter of Testing Request</Text>
          <Text>Generated from system</Text>
        </View>
      </Page>
    </Document>
  );
}