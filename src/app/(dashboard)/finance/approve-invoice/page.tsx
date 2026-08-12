import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getFinancePageData } from "@/lib/finance-page-data";
import InvoiceFlowClient from "@/components/finance/InvoiceFlowClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function ApproveInvoicePage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "finance.approve_invoice");

  if (!allowed) redirect("/dashboard");

  const data = await getFinancePageData();

  return (
    <section className="min-h-screen">
      <PageHeader eyebrow="Finance Flow" title="Approve Invoice" subtitle="Approve invoice, kirim ke customer, dan tindak lanjuti status pembayaran." />

      <InvoiceFlowClient
        mode="approve"
        initialInvoices={data.invoices}
        initialReadyQuotations={data.readyQuotations}
      />
    </section>
  );
}
