import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCustomerInvoicePageData } from "@/lib/finance-page-data";
import InvoiceFlowClient from "@/components/finance/InvoiceFlowClient";

export default async function CustomerInvoicePage() {
  const session = await getSession();

  if (!session) redirect("/login");

  if (session.roleCode !== "CUSTOMER_ENGAGEMENT") {
    redirect("/dashboard");
  }

  const data = await getCustomerInvoicePageData();

  return (
    <section className="min-h-screen">
      <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">Customer Area</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
          My Invoices
        </h1>
        <p className="mt-3 max-w-3xl text-slate-500">
          Lihat invoice yang sudah dibuat dan dikirim oleh finance.
        </p>
      </div>

      <InvoiceFlowClient
        mode="customer"
        initialInvoices={data.invoices}
        initialReadyQuotations={data.readyQuotations}
      />
    </section>
  );
}