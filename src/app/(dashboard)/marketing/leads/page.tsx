import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import LeadSurveyClient from "@/components/marketing/LeadSurveyClient";

export default async function LeadSurveyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await canAccessMenu(session.roleId, "marketing.leads"))) redirect("/dashboard");

  const [leads, customers, staff] = await Promise.all([
    prisma.lead.findMany({
      include: {
        customer: { include: { consultant: true } },
        assignedTo: { select: { id: true, name: true } },
        quotation: { select: { id: true, quotationNo: true, status: true } },
        surveys: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            parameters: { orderBy: { sort: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { isActive: true, role: { code: { in: ["TECHNICAL", "SALES_STAFF", "LAB_ANALYST", "LAB_SUPERVISOR"] } } },
      select: { id: true, name: true, role: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <LeadSurveyClient
      initialLeads={JSON.parse(JSON.stringify(leads))}
      customers={JSON.parse(JSON.stringify(customers))}
      staff={JSON.parse(JSON.stringify(staff))}
      viewerRole={session.roleCode}
    />
  );
}
