import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { getCannedReplies, getTicketDetail } from "@/lib/support-page-data";
import SupportConversationClient from "@/components/support/SupportConversationClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AgentTicketPage({ params }: PageProps) {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "support.desk");
  if (!allowed) redirect("/dashboard");

  const { id } = await params;
  const [detail, cannedReplies, agent] = await Promise.all([
    getTicketDetail(id, session, false),
    getCannedReplies(),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    }),
  ]);

  if (!detail) notFound();

  return (
    <SupportConversationClient
      initialTicket={detail.ticket}
      initialMessages={detail.messages}
      cannedReplies={cannedReplies}
      agentId={session.userId}
      viewerName={agent?.name || "Customer Service"}
    />
  );
}
