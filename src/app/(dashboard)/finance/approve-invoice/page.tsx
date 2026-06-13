import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getFinancePageData } from "@/lib/finance-page-data";
import InvoiceFlowClient from "@/components/finance/InvoiceFlowClient";

export default async function ApproveInvoicePage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "finance.approve_invoice");

  if (!allowed) redirect("/dashboard");

  const data = await getFinancePageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Finance Flow</p>
        <h1 className="mt-2 text-4xl font-bold">Approve Invoice</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Approve invoice, kirim invoice ke customer, dan tandai pembayaran.
        </p>
      </div>

      <InvoiceFlowClient
        mode="approve"
        initialInvoices={data.invoices}
        initialReadyQuotations={data.readyQuotations}
      />
    </section>
  );
}