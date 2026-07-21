import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";
import type {
  SupportMessageDTO,
  SupportTicketDTO,
  SenderRole,
} from "@/lib/support";

export const CUSTOMER_ROLE = "CUSTOMER_ENGAGEMENT";

export function isCustomerSession(session: SessionPayload) {
  return session.roleCode === CUSTOMER_ROLE;
}

/** Include standar untuk ticket beserta relasi yang dipakai serializer. */
export const ticketInclude = {
  category: true,
  customer: true,
  assignedTo: true,
} satisfies Prisma.SupportTicketInclude;

type TicketWithRelations = Prisma.SupportTicketGetPayload<{
  include: typeof ticketInclude;
}>;

type MessageWithSender = Prisma.SupportMessageGetPayload<{
  include: { sender: true };
}>;

export function serializeTicket(
  ticket: TicketWithRelations,
  extra?: { unreadForCustomer?: number; unreadForAgent?: number }
): SupportTicketDTO {
  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    categoryId: ticket.categoryId,
    categoryName: ticket.category?.name ?? null,
    customerId: ticket.customerId,
    customerName: ticket.customer?.name ?? null,
    assignedToId: ticket.assignedToId,
    assignedToName: ticket.assignedTo?.name ?? null,
    lastMessageAt: ticket.lastMessageAt?.toISOString() ?? null,
    firstResponseAt: ticket.firstResponseAt?.toISOString() ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    rating: ticket.rating,
    ratingComment: ticket.ratingComment,
    unreadForCustomer: extra?.unreadForCustomer,
    unreadForAgent: extra?.unreadForAgent,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function serializeMessage(
  message: MessageWithSender
): SupportMessageDTO {
  return {
    id: message.id,
    ticketId: message.ticketId,
    senderId: message.senderId,
    senderRole: message.senderRole as SenderRole,
    senderName: message.sender?.name ?? null,
    body: message.body,
    isInternalNote: message.isInternalNote,
    createdAt: message.createdAt.toISOString(),
  };
}

/**
 * Hitung unread per ticket dalam satu query (hindari N+1).
 * - forCustomer: pesan AGENT non-internal yang belum dibaca customer.
 * - agent: pesan CUSTOMER yang belum dibaca agent.
 */
export async function computeUnreadMap(
  ticketIds: string[],
  forCustomer: boolean
): Promise<Record<string, number>> {
  if (ticketIds.length === 0) return {};

  const where: Prisma.SupportMessageWhereInput = forCustomer
    ? {
        ticketId: { in: ticketIds },
        senderRole: "AGENT",
        isInternalNote: false,
        readByCustomerAt: null,
      }
    : {
        ticketId: { in: ticketIds },
        senderRole: "CUSTOMER",
        readByAgentAt: null,
      };

  const grouped = await prisma.supportMessage.groupBy({
    by: ["ticketId"],
    where,
    _count: { _all: true },
  });

  const map: Record<string, number> = {};
  for (const row of grouped) {
    map[row.ticketId] = row._count._all;
  }
  return map;
}

/** Total unread untuk badge sidebar. */
export async function countUnreadForSession(
  session: SessionPayload
): Promise<number> {
  if (isCustomerSession(session)) {
    if (!session.customerId) return 0;

    return prisma.supportMessage.count({
      where: {
        senderRole: "AGENT",
        isInternalNote: false,
        readByCustomerAt: null,
        ticket: { customerId: session.customerId },
      },
    });
  }

  // Agent: pesan customer yang belum dibaca di tiket yang masih terbuka.
  return prisma.supportMessage.count({
    where: {
      senderRole: "CUSTOMER",
      readByAgentAt: null,
      ticket: {
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] },
      },
    },
  });
}
