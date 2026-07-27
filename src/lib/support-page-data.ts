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
    include: { sender: true, attachments: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    ticket: serializeTicket(ticket),
    messages: messages.map(serializeMessage),
  };
}

/** Antrian tiket untuk agent, halaman pertama (paginated). */
export async function getAgentTickets(pageSize = 15) {
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      include: ticketInclude,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: pageSize,
    }),
    prisma.supportTicket.count(),
  ]);

  const unread = await computeUnreadMap(
    tickets.map((t) => t.id),
    false
  );

  return {
    tickets: tickets.map((t) =>
      serializeTicket(t, { unreadForAgent: unread[t.id] ?? 0 })
    ),
    pagination: {
      page: 1,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getCannedReplies(): Promise<CannedReplyDTO[]> {
  const replies = await prisma.cannedReply.findMany({
    where: { isActive: true },
    orderBy: { sort: "asc" },
  });

  return replies.map((r) => ({ id: r.id, title: r.title, body: r.body }));
}

export async function getCustomerSupportContexts(customerId: string) {
  const [quotations, samples] = await Promise.all([
    prisma.quotation.findMany({
      where: { customerId },
      select: { id: true, quotationNo: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.sample.findMany({
      where: { customerId },
      select: {
        id: true,
        sampleNo: true,
        status: true,
        quotation: { select: { quotationNo: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const revisions =
    samples.length === 0
      ? []
      : await prisma.auditRevision.findMany({
          where: {
            entityType: "LAB_RESULT",
            entityId: { in: samples.map((item) => item.id) },
          },
          select: {
            id: true,
            entityId: true,
            revisionNo: true,
            action: true,
            changeSummary: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
  const sampleLabel = new Map(samples.map((item) => [item.id, item.sampleNo]));
  return JSON.parse(
    JSON.stringify({
      quotations,
      samples,
      revisions: revisions.map((item) => ({
        ...item,
        sampleNo: sampleLabel.get(item.entityId) || item.entityId,
      })),
    })
  );
}
