import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatDate, formatRupiah } from "@/lib/exports/format";

type Props = {
  logoSrc?: string | null;
  invoice: any;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 34,
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
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#475569",
  },
  badge: {
    marginTop: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 999,
    color: "#047857",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-end",
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
    marginBottom: 5,
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
    marginTop: 12,
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
    padding: 6,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  td: {
    padding: 6,
    fontSize: 7.5,
    color: "#0f172a",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  noBorderRight: {
    borderRightWidth: 0,
  },
  wNo: { width: "5%" },
  wDesc: { width: "35%" },
  wSample: { width: "13%" },
  wQty: { width: "8%" },
  wPrice: { width: "18%" },
  wSubtotal: { width: "21%" },
  summaryWrapper: {
    marginTop: 12,
    flexDirection: "row",
  },
  summaryLeft: {
    flex: 1.1,
    paddingRight: 12,
  },
  summaryRight: {
    flex: 0.75,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 8.5,
  },
  summaryValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  grandRow: {
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    marginTop: 4,
    paddingTop: 7,
  },
  grandText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#047857",
  },
  signatureWrapper: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "40%",
    textAlign: "center",
  },
  signatureSpace: {
    height: 58,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 34,
    right: 34,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 7,
  },
});

function getFinalCoaNo(invoice: any) {
  const sample = invoice.quotation.samples?.[0];
  const finalCoa = sample?.coa?.find((item: any) => item.type === "FINAL");
  return finalCoa?.coaNo || "-";
}

export default function InvoicePdf({ invoice, logoSrc }: Props) {
  const quotation = invoice.quotation;
  const customer = quotation.customer;

  const parameterTotal = quotation.totalAmount || 0;
  const samplingCost = quotation.samplingCost || 0;
  const vatPercent = quotation.vatPercent || 0;
  const vatAmount = quotation.vatAmount || 0;
  const grandTotal =
    invoice.amount ||
    quotation.grandTotal ||
    parameterTotal + samplingCost + vatAmount;

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <View>{logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}</View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.subtitle}>Invoice No: {invoice.invoiceNo}</Text>
            <Text style={styles.subtitle}>Date: {formatDate(invoice.createdAt)}</Text>
            <Text style={styles.subtitle}>Quotation: {quotation.quotationNo}</Text>
            <Text style={styles.badge}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Company</Text>
              <Text style={styles.value}>
                {customer.billingCompany || customer.company || customer.name || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Contact Person</Text>
              <Text style={styles.value}>
                {customer.billingContactPerson ||
                  customer.contactPerson ||
                  "-"}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Billing Email</Text>
              <Text style={styles.normalValue}>
                {customer.billingEmail || customer.email || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Billing Phone</Text>
              <Text style={styles.normalValue}>
                {customer.billingPhone || customer.phone || "-"}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Billing Address</Text>
              <Text style={styles.normalValue}>
                {[customer.billingAddressLine1, customer.billingAddressLine2]
                  .filter(Boolean)
                  .join(", ") ||
                  [customer.addressLine1, customer.addressLine2]
                    .filter(Boolean)
                    .join(", ") ||
                  "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>PO Number</Text>
              <Text style={styles.value}>{quotation.purchaseOrder?.poNumber || "-"}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>LTR Number</Text>
              <Text style={styles.value}>{quotation.ltr?.ltrNo || "-"}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>COC Number</Text>
              <Text style={styles.value}>{quotation.coc?.cocNo || "-"}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Sample Number</Text>
              <Text style={styles.value}>
                {quotation.samples?.[0]?.sampleNo ||
                  quotation.coc?.sample?.sampleNo ||
                  "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Final COA</Text>
              <Text style={styles.value}>{getFinalCoaNo(invoice)}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Template COA</Text>
              <Text style={styles.value}>{quotation.coaTemplate?.name || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wNo]}>No</Text>
            <Text style={[styles.th, styles.wDesc]}>Description</Text>
            <Text style={[styles.th, styles.wSample]}>Sample ID</Text>
            <Text style={[styles.th, styles.wQty]}>Qty</Text>
            <Text style={[styles.th, styles.wPrice]}>Unit Price</Text>
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
              </Text>
              <Text style={[styles.td, styles.wSample]}>
                {item.customerSampleId || "-"}
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
          <View style={styles.summaryLeft}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Information</Text>
              <Text style={styles.normalValue}>
                {quotation.paymentTerm ||
                  "Pembayaran dilakukan setelah invoice diterima."}
              </Text>
              <Text style={[styles.normalValue, { marginTop: 6 }]}>
                Status invoice saat ini: {invoice.status}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRight}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Parameter Total</Text>
              <Text style={styles.summaryValue}>{formatRupiah(parameterTotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sampling Cost</Text>
              <Text style={styles.summaryValue}>{formatRupiah(samplingCost)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT {vatPercent}%</Text>
              <Text style={styles.summaryValue}>{formatRupiah(vatAmount)}</Text>
            </View>

            <View style={[styles.summaryRow, styles.grandRow]}>
              <Text style={styles.grandText}>Total Invoice</Text>
              <Text style={styles.grandText}>{formatRupiah(grandTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureWrapper}>
          <View style={styles.signatureBox}>
            <Text>Prepared by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Finance</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>Received by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Customer</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>LIMS-Medialab - Invoice</Text>
          <Text>Generated from system</Text>
        </View>
      </Page>
    </Document>
  );
}