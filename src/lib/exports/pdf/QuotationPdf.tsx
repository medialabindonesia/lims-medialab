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

type QuotationPdfProps = {
  logoSrc?: string | null;
  quotation: any;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 12,
    marginBottom: 14,
  },
  logo: {
    width: 150,
    height: 42,
    objectFit: "contain",
  },
  headerRight: {
    marginLeft: "auto",
    textAlign: "right",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#475569",
  },
  section: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#047857",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  col: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    color: "#64748b",
    fontSize: 8,
  },
  value: {
    color: "#0f172a",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  normalValue: {
    color: "#0f172a",
    fontSize: 9,
    marginTop: 1,
  },
  table: {
    marginTop: 8,
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
    minHeight: 28,
  },
  th: {
    padding: 5,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  td: {
    padding: 5,
    fontSize: 7.5,
    color: "#0f172a",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  noBorderRight: {
    borderRightWidth: 0,
  },
  wNo: { width: "4%" },
  wDesc: { width: "24%" },
  wSample: { width: "11%" },
  wLocation: { width: "18%" },
  wMatrix: { width: "16%" },
  wQty: { width: "6%" },
  wPrice: { width: "10%" },
  wSubtotal: { width: "11%" },
  summaryWrapper: {
    marginTop: 10,
    flexDirection: "row",
  },
  terms: {
    flex: 1.25,
    paddingRight: 12,
  },
  summary: {
    flex: 0.75,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 9,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 8.5,
  },
  summaryValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  grandRow: {
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    marginTop: 4,
    paddingTop: 6,
  },
  grandText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#047857",
  },
  signatureWrapper: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "42%",
    textAlign: "center",
  },
  signatureSpace: {
    height: 54,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 7,
  },
});

export default function QuotationPdf({
  quotation,
  logoSrc,
}: QuotationPdfProps) {
  const customer = quotation.customer;
  const parameterTotal = quotation.totalAmount || 0;
  const samplingCost = quotation.samplingCost || 0;
  const vatPercent = quotation.vatPercent || 0;
  const vatAmount = quotation.vatAmount || 0;
  const grandTotal =
    quotation.grandTotal && quotation.grandTotal > 0
      ? quotation.grandTotal
      : parameterTotal + samplingCost + vatAmount;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>{logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}</View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>QUOTATION</Text>
            <Text style={styles.subtitle}>No: {quotation.quotationNo}</Text>
            <Text style={styles.subtitle}>
              Date: {formatDate(quotation.quotationDate)}
            </Text>
            <Text style={styles.subtitle}>
              Valid Until: {formatDate(quotation.validUntil)}
            </Text>
          </View>
        </View>

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
              <Text style={styles.label}>Address</Text>
              <Text style={styles.normalValue}>
                {[customer.addressLine1, customer.addressLine2]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Billing To</Text>
              <Text style={styles.normalValue}>
                {customer.billingCompany || customer.company || "-"}
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
          <Text style={styles.sectionTitle}>Quotation Detail</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Template COA</Text>
              <Text style={styles.value}>
                {quotation.coaTemplate?.name || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Sampling By</Text>
              <Text style={styles.value}>
                {samplingByLabel(quotation.samplingBy)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Testing Objective</Text>
              <Text style={styles.value}>
                {testingObjectiveLabel(quotation.testingObjective)}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>TAT Requested</Text>
              <Text style={styles.value}>{tatLabel(quotation.tatRequested)}</Text>
            </View>
          </View>

          {quotation.note ? (
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Note</Text>
                <Text style={styles.normalValue}>{quotation.note}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wNo]}>No</Text>
            <Text style={[styles.th, styles.wDesc]}>Description</Text>
            <Text style={[styles.th, styles.wSample]}>Sample ID</Text>
            <Text style={[styles.th, styles.wLocation]}>Location</Text>
            <Text style={[styles.th, styles.wMatrix]}>Matrix / Regulation</Text>
            <Text style={[styles.th, styles.wQty]}>Qty</Text>
            <Text style={[styles.th, styles.wPrice]}>Price</Text>
            <Text style={[styles.th, styles.wSubtotal, styles.noBorderRight]}>
              Subtotal
            </Text>
          </View>

          {quotation.items.map((item: any, index: number) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.wNo]}>{index + 1}</Text>
              <Text style={[styles.td, styles.wDesc]}>
                {item.description || item.parameter.name}
                {item.method ? `\nMethod: ${item.method}` : ""}
                {item.durationSampling ? `\nDuration: ${item.durationSampling}` : ""}
              </Text>
              <Text style={[styles.td, styles.wSample]}>
                {item.customerSampleId || "-"}
              </Text>
              <Text style={[styles.td, styles.wLocation]}>
                {item.samplingLocation || "-"}
              </Text>
              <Text style={[styles.td, styles.wMatrix]}>
                {item.regulationMatrix || "-"}
              </Text>
              <Text style={[styles.td, styles.wQty]}>{item.qty}</Text>
              <Text style={[styles.td, styles.wPrice]}>
                {formatRupiah(item.price)}
              </Text>
              <Text style={[styles.td, styles.wSubtotal, styles.noBorderRight]}>
                {formatRupiah(item.price * item.qty)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryWrapper}>
          <View style={styles.terms}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              <Text style={styles.normalValue}>
                {quotation.paymentTerm || "Pembayaran dilakukan sesuai kesepakatan."}
              </Text>
              <Text style={[styles.normalValue, { marginTop: 6 }]}>
                {quotation.termsNote ||
                  "Harga belum termasuk biaya tambahan di luar lingkup pekerjaan yang disepakati."}
              </Text>
            </View>
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Parameter Total</Text>
              <Text style={styles.summaryValue}>
                {formatRupiah(parameterTotal)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sampling Cost</Text>
              <Text style={styles.summaryValue}>
                {formatRupiah(samplingCost)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT {vatPercent}%</Text>
              <Text style={styles.summaryValue}>{formatRupiah(vatAmount)}</Text>
            </View>

            <View style={[styles.summaryRow, styles.grandRow]}>
              <Text style={styles.grandText}>Grand Total</Text>
              <Text style={styles.grandText}>{formatRupiah(grandTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureWrapper}>
          <View style={styles.signatureBox}>
            <Text>Approved by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Sales / Authorized Person</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>Confirmed by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Customer</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>LIMS-Medialab - Laboratory Information Management System</Text>
          <Text>Generated from system</Text>
        </View>
      </Page>
    </Document>
  );
}