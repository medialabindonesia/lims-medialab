import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import QuotationFlowClient from "@/components/quotation/QuotationFlowClient";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await canAccessMenu(session.roleId, "quotation.request"))) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const [lead, customers] = await Promise.all([
    query.leadId
      ? prisma.lead.findFirst({
          where: { id: query.leadId, customerId: query.customerId },
          include: { customer: true },
        })
      : Promise.resolve(null),
    session.roleCode === "CUSTOMER_ENGAGEMENT" && session.customerId
      ? prisma.customer.findMany({
          where: { id: session.customerId, isActive: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <QuotationFlowClient
      mode="request"
      formPresentation="page"
      customers={JSON.parse(JSON.stringify(customers))}
      initialQuotations={[]}
      viewerRole={session.roleCode}
      initialLead={lead ? JSON.parse(JSON.stringify(lead)) : null}
    />
  );
}
