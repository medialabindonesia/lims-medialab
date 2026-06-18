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
  stps: any;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 14,
    marginBottom: 18,
  },
  logo: {
    width: 155,
    height: 44,
    objectFit: "contain",
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
    fontSize: 9,
    color: "#475569",
  },
  centerTitle: {
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textDecoration: "underline",
  },
  centerNo: {
    textAlign: "center",
    fontSize: 10,
    marginBottom: 18,
  },
  paragraph: {
    lineHeight: 1.6,
    marginBottom: 10,
    textAlign: "justify",
  },
  section: {
    marginTop: 10,
    padding: 12,
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
    marginBottom: 6,
  },
  label: {
    width: 130,
    color: "#64748b",
  },
  value: {
    flex: 1,
    color: "#0f172a",
    fontFamily: "Helvetica-Bold",
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
    minHeight: 28,
  },
  th: {
    padding: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  td: {
    padding: 6,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  wNo: { width: "8%" },
  wName: { width: "46%" },
  wPosition: { width: "46%" },
  noBorderRight: {
    borderRightWidth: 0,
  },
  signatureWrapper: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBox: {
    width: 240,
    textAlign: "center",
  },
  signatureSpace: {
    height: 70,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 7,
  },
});

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

export default function StpsPdf({ stps, logoSrc }: Props) {
  const quotation = stps.quotation;
  const customer = quotation.customer;
  const samplers = getSamplers(stps);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>{logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}</View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>SURAT TUGAS</Text>
            <Text style={styles.subtitle}>STPS No: {stps.stpsNo}</Text>
            <Text style={styles.subtitle}>
              Date: {formatDate(stps.issuedDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.centerTitle}>SURAT TUGAS PENGAMBILAN SAMPEL</Text>
        <Text style={styles.centerNo}>Nomor: {stps.stpsNo}</Text>

        <Text style={styles.paragraph}>
          Yang bertanda tangan di bawah ini menugaskan personel berikut untuk
          melaksanakan kegiatan pengambilan sampel berdasarkan dokumen COC dan
          quotation yang telah disetujui.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document Reference</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Quotation No</Text>
            <Text style={styles.value}>{quotation.quotationNo}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>LTR No</Text>
            <Text style={styles.value}>{quotation.ltr?.ltrNo || "-"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>COC No</Text>
            <Text style={styles.value}>{quotation.coc?.cocNo || "-"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{customer.company || customer.name}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Sampling Location</Text>
            <Text style={styles.value}>
              {[customer.samplingAddressLine1, customer.samplingAddressLine2]
                .filter(Boolean)
                .join(", ") || "-"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Samplers</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.wNo]}>No</Text>
              <Text style={[styles.th, styles.wName]}>Name</Text>
              <Text style={[styles.th, styles.wPosition, styles.noBorderRight]}>
                Position
              </Text>
            </View>

            {samplers.length > 0 ? (
              samplers.map((sampler, index) => (
                <View key={`${sampler.name}-${index}`} style={styles.tableRow}>
                  <Text style={[styles.td, styles.wNo]}>{index + 1}</Text>
                  <Text style={[styles.td, styles.wName]}>
                    {sampler.name || "-"}
                  </Text>
                  <Text style={[styles.td, styles.wPosition, styles.noBorderRight]}>
                    {sampler.position || "-"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.tableRow}>
                <Text style={[styles.td, styles.wNo]}>1</Text>
                <Text style={[styles.td, styles.wName]}>-</Text>
                <Text style={[styles.td, styles.wPosition, styles.noBorderRight]}>
                  -
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.paragraph, { marginTop: 16 }]}>
          Surat tugas ini dibuat untuk digunakan sebagaimana mestinya selama
          kegiatan pengambilan sampel berlangsung.
        </Text>

        <View style={styles.signatureWrapper}>
          <View style={styles.signatureBox}>
            <Text>Jakarta, {formatDate(stps.issuedDate)}</Text>
            <Text>{stps.technicalManagerPosition || "Technical Manager"}</Text>
            <View style={styles.signatureSpace} />
            <Text style={styles.value}>
              {stps.technicalManagerName || "Technical Manager"}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>LIMS-Medialab - Surat Tugas Pengambilan Sampel</Text>
          <Text>Generated from system</Text>
        </View>
      </Page>
    </Document>
  );
}