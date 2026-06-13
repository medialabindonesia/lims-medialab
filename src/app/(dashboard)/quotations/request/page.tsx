import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getQuotationPageData } from "@/lib/quotation-page-data";
import QuotationFlowClient from "@/components/quotation/QuotationFlowClient";

export default async function RequestQuotationPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "quotation.request");

  if (!allowed) {
    redirect("/dashboard");
  }

  const data = await getQuotationPageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">Quotation Flow</p>
        <h1 className="mt-2 text-4xl font-bold">Request Quotation</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Customer atau sales membuat quotation berdasarkan master customer dan
          master parameter analisis.
        </p>
      </div>

      <QuotationFlowClient
        mode="request"
        customers={data.customers}
        parameters={data.parameters}
        coaTemplates={data.coaTemplates}
        initialQuotations={data.quotations}
      />
    </section>
  );
}