import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getQuotationPageData } from "@/lib/quotation-page-data";
import QuotationFlowClient from "@/components/quotation/QuotationFlowClient";

export default async function ApproveQuotationPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "quotation.approve");

  if (!allowed) {
    redirect("/dashboard");
  }

  const data = await getQuotationPageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Quotation Flow</p>
        <h1 className="mt-2 text-4xl font-bold">Approve Quotation</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Sales Manager atau Director menyetujui quotation yang sudah diverifikasi.
        </p>
      </div>

      <QuotationFlowClient
        mode="approve"
        customers={data.customers}
        parameters={data.parameters}
        coaTemplates={data.coaTemplates}
        initialQuotations={data.quotations}
      />
    </section>
  );
}