import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getQuotationPageData } from "@/lib/quotation-page-data";
import QuotationFlowClient from "@/components/quotation/QuotationFlowClient";
import { prisma } from "@/lib/db";

export default async function RequestQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "quotation.request");

  if (!allowed) {
    redirect("/dashboard");
  }

  const data = await getQuotationPageData();
  const query = await searchParams;
  const lead = query.leadId
    ? await prisma.lead.findFirst({
        where: { id: query.leadId, customerId: query.customerId },
        include: { customer: true },
      })
    : null;

  return (
    <section>
      <QuotationFlowClient
        mode="request"
        customers={data.customers}
        initialQuotations={data.quotations}
        viewerRole={session.roleCode}
        initialLead={lead ? JSON.parse(JSON.stringify(lead)) : null}
      />
    </section>
  );
}
