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

type Props = {
  logoSrc?: string | null;
  coa: any;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
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
    fontSize: 18,
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
    minHeight: 30,
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
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  noBorderRight: {
    borderRightWidth: 0,
  },
  wNo: { width: "5%" },
  wParam: { width: "24%" },
  wResult: { width: "14%" },
  wUnit: { width: "10%" },
  wMethod: { width: "18%" },
  wStandard: { width: "16%" },
  wStatus: { width: "13%" },
  signatureWrapper: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "38%",
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

function getResultValue(item: any) {
  return (
    item.resultValue ??
    item.result ??
    item.value ??
    item.resultText ??
    item.resultNumber ??
    "-"
  );
}

function getUnit(item: any) {
  return item.unit || item.templateParameter?.unit || item.parameter?.unit || "-";
}

function getMethod(item: any) {
  return (
    item.method ||
    item.templateParameter?.method ||
    item.parameter?.method ||
    "-"
  );
}

function getStandard(item: any) {
  return (
    item.standard ||
    item.templateParameter?.standard ||
    item.templateParameter?.limitValue ||
    "-"
  );
}

function coaTitle(type?: string | null) {
  if (type === "FINAL") return "CERTIFICATE OF ANALYSIS";
  return "PRELIMINARY CERTIFICATE OF ANALYSIS";
}

export default function CoaPdf({ coa, logoSrc }: Props) {
  const sample = coa.sample;
  const quotation = sample.quotation;
  const customer = sample.customer || quotation?.customer;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>{coaTitle(coa.type)}</Text>
            <Text style={styles.subtitle}>COA No: {coa.coaNo}</Text>
            <Text style={styles.subtitle}>Sample No: {sample.sampleNo}</Text>
            <Text style={styles.subtitle}>
              Quotation: {quotation?.quotationNo || "-"}
            </Text>
            <Text style={styles.badge}>{coa.type} · {coa.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Sample Information</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Customer / Company</Text>
              <Text style={styles.value}>
                {customer?.company || customer?.name || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Contact Person</Text>
              <Text style={styles.value}>
                {customer?.contactPerson || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Template COA</Text>
              <Text style={styles.value}>
                {sample.coaTemplate?.name || quotation?.coaTemplate?.name || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Issue Date</Text>
              <Text style={styles.value}>{formatDate(coa.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>PO Number</Text>
              <Text style={styles.normalValue}>
                {quotation?.purchaseOrder?.poNumber || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>LTR Number</Text>
              <Text style={styles.normalValue}>
                {quotation?.ltr?.ltrNo || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>COC Number</Text>
              <Text style={styles.normalValue}>
                {quotation?.coc?.cocNo || "-"}
              </Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Sample Status</Text>
              <Text style={styles.normalValue}>{sample.status || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wNo]}>No</Text>
            <Text style={[styles.th, styles.wParam]}>Parameter</Text>
            <Text style={[styles.th, styles.wResult]}>Result</Text>
            <Text style={[styles.th, styles.wUnit]}>Unit</Text>
            <Text style={[styles.th, styles.wMethod]}>Method</Text>
            <Text style={[styles.th, styles.wStandard]}>Standard / Limit</Text>
            <Text style={[styles.th, styles.wStatus, styles.noBorderRight]}>
              Status
            </Text>
          </View>

          {sample.parameters.map((item: any, index: number) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.wNo]}>{index + 1}</Text>
              <Text style={[styles.td, styles.wParam]}>
                {item.templateParameter?.displayName || item.parameter?.name || "-"}
              </Text>
              <Text style={[styles.td, styles.wResult]}>
                {String(getResultValue(item))}
              </Text>
              <Text style={[styles.td, styles.wUnit]}>{getUnit(item)}</Text>
              <Text style={[styles.td, styles.wMethod]}>{getMethod(item)}</Text>
              <Text style={[styles.td, styles.wStandard]}>
                {getStandard(item)}
              </Text>
              <Text style={[styles.td, styles.wStatus, styles.noBorderRight]}>
                {item.status || "-"}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.signatureWrapper}>
          <View style={styles.signatureBox}>
            <Text>Prepared by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Laboratory</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>Approved by,</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>Laboratory Manager</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>LIMS-Medialab - {coaTitle(coa.type)}</Text>
          <Text>Generated from system</Text>
        </View>
      </Page>
    </Document>
  );
}