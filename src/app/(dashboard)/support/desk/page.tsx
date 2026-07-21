import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getAgentTickets } from "@/lib/support-page-data";
import SupportDeskClient from "@/components/support/SupportDeskClient";

export default async function SupportDeskPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "support.desk");
  if (!allowed) redirect("/dashboard");

  const { tickets, pagination } = await getAgentTickets();

  return (
    <SupportDeskClient
      initialTickets={tickets}
      initialPagination={pagination}
      agentId={session.userId}
    />
  );
}
