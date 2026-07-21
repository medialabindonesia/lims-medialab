import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireApiPermission } from "@/lib/api-permission";
import { publishSupport, supportChannels } from "@/lib/ably";
import {
  isCustomerSession,
  serializeMessage,
  serializeTicket,
  ticketInclude,
} from "@/lib/support-server";
import {
  statusStyle,
  priorityStyle,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/support";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"])
    .optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignToMe: z.boolean().optional(),
  unassign: z.boolean().optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const isCustomer = isCustomerSession(session);

  if (!isCustomer) {
    const permission = await requireApiPermission("support.desk", "canView");
    if (!permission.allowed) return permission.response;
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: ticketInclude,
  });

  if (!ticket) {
    return NextResponse.json(
      { message: "Tiket tidak ditemukan" },
      { status: 404 }
    );
  }

  if (isCustomer && ticket.customerId !== session.customerId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.supportMessage.findMany({
    where: {
      ticketId: id,
      // Internal note tidak boleh terlihat customer.
      ...(isCustomer ? { isInternalNote: false } : {}),
    },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ticket: serializeTicket(ticket),
    messages: messages.map(serializeMessage),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Hanya agent yang boleh ubah status/priority/assignment.
  const permission = await requireApiPermission("support.desk", "canUpdate");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });

  if (!ticket) {
    return NextResponse.json(
      { message: "Tiket tidak ditemukan" },
      { status: 404 }
    );
  }

  const data: Record<string, unknown> = {};
  const systemNotes: string[] = [];
  const actorName = session.email.split("@")[0];

  if (parsed.data.assignToMe) {
    data.assignedToId = session.userId;
    systemNotes.push(`Tiket ditugaskan ke agent (${actorName}).`);
    if (ticket.status === "OPEN") {
      data.status = "IN_PROGRESS";
    }
  } else if (parsed.data.unassign) {
    data.assignedToId = null;
    systemNotes.push("Penugasan agent dilepas.");
  }

  if (parsed.data.status && parsed.data.status !== ticket.status) {
    const next = parsed.data.status as TicketStatus;
    data.status = next;
    systemNotes.push(`Status diubah ke ${statusStyle(next).label}.`);

    if (next === "RESOLVED") data.resolvedAt = new Date();
    if (next === "CLOSED") data.closedAt = new Date();
  }

  if (parsed.data.priority && parsed.data.priority !== ticket.priority) {
    const next = parsed.data.priority as TicketPriority;
    data.priority = next;
    systemNotes.push(`Prioritas diubah ke ${priorityStyle(next).label}.`);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada perubahan" },
      { status: 400 }
    );
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data,
    include: ticketInclude,
  });

  // Catat perubahan sebagai pesan SYSTEM (jadi timeline percakapan).
  const systemMessage =
    systemNotes.length > 0
      ? await prisma.supportMessage.create({
          data: {
            ticketId: id,
            senderId: session.userId,
            senderRole: "SYSTEM",
            body: systemNotes.join(" "),
          },
          include: { sender: true },
        })
      : null;

  const dto = serializeTicket(updated);

  // Publish ke kanal tiket (kedua pihak), desk (antrian), dan customer (badge).
  await Promise.all([
    publishSupport(supportChannels.ticket(id), "ticket.update", {
      ticket: dto,
      message: systemMessage ? serializeMessage(systemMessage) : null,
    }),
    publishSupport(supportChannels.desk(), "ticket.update", dto),
    publishSupport(supportChannels.customer(updated.customerId), "notify", {
      type: "ticket.update",
      ticketId: id,
    }),
  ]);

  return NextResponse.json({
    message: "Tiket diperbarui",
    ticket: dto,
    systemMessage: systemMessage ? serializeMessage(systemMessage) : null,
  });
}
