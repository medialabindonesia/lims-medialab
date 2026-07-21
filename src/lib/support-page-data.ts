import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";
import type { CannedReplyDTO, FaqCategoryDTO } from "@/lib/support";
import {
  computeUnreadMap,
  serializeMessage,
  serializeTicket,
  ticketInclude,
} from "@/lib/support-server";

/** FAQ aktif (kategori + item) untuk Support Center customer. */
export async function getActiveFaq(): Promise<FaqCategoryDTO[]> {
  const categories = await prisma.faqCategory.findMany({
    where: { isActive: true },
    orderBy: { sort: "asc" },
    include: {
      items: { where: { isActive: true }, orderBy: { sort: "asc" } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    items: category.items.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      helpfulCount: item.helpfulCount,
      notHelpfulCount: item.notHelpfulCount,
    })),
  }));
}

/** Tiket milik customer + hitung unread (dari sisi customer). */
export async function getCustomerTickets(customerId: string) {
  const tickets = await prisma.supportTicket.findMany({
    where: { customerId },
    include: ticketInclude,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  const unread = await computeUnreadMap(
    tickets.map((t) => t.id),
    true
  );

  return tickets.map((t) =>
    serializeTicket(t, { unreadForCustomer: unread[t.id] ?? 0 })
  );
}

/** Detail tiket + pesan, dengan authz sesuai session. Null kalau tak berhak. */
export async function getTicketDetail(
  ticketId: string,
  session: SessionPayload,
  isCustomer: boolean
) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: ticketInclude,
  });

  if (!ticket) return null;
  if (isCustomer && ticket.customerId !== session.customerId) return null;

  const messages = await prisma.supportMessage.findMany({
    where: {
      ticketId,
      ...(isCustomer ? { isInternalNote: false } : {}),
    },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    ticket: serializeTicket(ticket),
    messages: messages.map(serializeMessage),
  };
}

/** Antrian tiket untuk agent (semua tiket). */
export async function getAgentTickets() {
  const tickets = await prisma.supportTicket.findMany({
    include: ticketInclude,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  const unread = await computeUnreadMap(
    tickets.map((t) => t.id),
    false
  );

  return tickets.map((t) =>
    serializeTicket(t, { unreadForAgent: unread[t.id] ?? 0 })
  );
}

export async function getCannedReplies(): Promise<CannedReplyDTO[]> {
  const replies = await prisma.cannedReply.findMany({
    where: { isActive: true },
    orderBy: { sort: "asc" },
  });

  return replies.map((r) => ({ id: r.id, title: r.title, body: r.body }));
}
