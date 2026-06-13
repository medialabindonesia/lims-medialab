import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getQuotationPageData } from "@/lib/quotation-page-data";
import QuotationFlowClient from "@/components/quotation/QuotationFlowClient";

export default async function CreateCocPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "technical.coc");

  if (!allowed) {
    redirect("/dashboard");
  }

  const data = await getQuotationPageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Technical Flow</p>
        <h1 className="mt-2 text-4xl font-bold">Create COC</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Technical membuat COC setelah LTR selesai dibuat.
        </p>
      </div>

      <QuotationFlowClient
        mode="coc"
        customers={data.customers}
        parameters={data.parameters}
        coaTemplates={data.coaTemplates}
        initialQuotations={data.quotations}
      />
    </section>
  );
}