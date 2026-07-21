import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isCustomerSession } from "@/lib/support-server";
import { getTicketDetail } from "@/lib/support-page-data";
import SupportChatClient from "@/components/support/SupportChatClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerTicketPage({ params }: PageProps) {
  const session = await getSession();

  if (!session) redirect("/login");

  if (!isCustomerSession(session)) {
    redirect("/support/desk");
  }

  const { id } = await params;
  const detail = await getTicketDetail(id, session, true);

  if (!detail) notFound();

  return (
    <SupportChatClient
      initialTicket={detail.ticket}
      initialMessages={detail.messages}
    />
  );
}
