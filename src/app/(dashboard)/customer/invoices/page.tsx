import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCustomerInvoicePageData } from "@/lib/finance-page-data";
import InvoiceFlowClient from "@/components/finance/InvoiceFlowClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function CustomerInvoicePage() {
  const session = await getSession();

  if (!session) redirect("/login");

  if (session.roleCode !== "CUSTOMER_ENGAGEMENT") {
    redirect("/dashboard");
  }

  const data = await getCustomerInvoicePageData();

  return (
    <section className="min-h-screen">
      <PageHeader
        eyebrow="Area Customer"
        title="Tagihan Saya"
        subtitle="Lihat tagihan yang sudah diterbitkan, unduh dokumennya, dan kirim bukti pembayaran."
      />

      <InvoiceFlowClient
        mode="customer"
        initialInvoices={data.invoices}
        initialReadyQuotations={data.readyQuotations}
      />
    </section>
  );
}