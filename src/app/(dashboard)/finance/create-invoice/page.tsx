import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getFinancePageData } from "@/lib/finance-page-data";
import InvoiceFlowClient from "@/components/finance/InvoiceFlowClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function CreateInvoicePage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "finance.create_invoice");

  if (!allowed) redirect("/dashboard");

  const data = await getFinancePageData();

  return (
    <section className="min-h-screen">
      <PageHeader eyebrow="Finance Flow" title="Create Invoice" subtitle="Buat invoice berdasarkan quotation yang sudah selesai Final COA." />

      <InvoiceFlowClient
        mode="create"
        initialInvoices={data.invoices}
        initialReadyQuotations={data.readyQuotations}
      />
    </section>
  );
}
