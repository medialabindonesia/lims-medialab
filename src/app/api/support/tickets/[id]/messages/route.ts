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

type RouteContext = {
  params: Promise<{ id: string }>;
};

const messageSchema = z.object({
  body: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000),
  isInternalNote: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const isCustomer = isCustomerSession(session);

  if (!isCustomer) {
    const permission = await requireApiPermission("support.desk", "canUpdate");
    if (!permission.allowed) return permission.response;
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });

  if (!ticket) {
    return NextResponse.json(
      { message: "Tiket tidak ditemukan" },
      { status: 404 }
    );
  }

  if (isCustomer && ticket.customerId !== session.customerId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (ticket.status === "CLOSED") {
    return NextResponse.json(
      { message: "Tiket sudah ditutup" },
      { status: 400 }
    );
  }

  const payload = await request.json();
  const parsed = messageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const now = new Date();
  const isInternalNote = !isCustomer && parsed.data.isInternalNote === true;

  const message = await prisma.supportMessage.create({
    data: {
      ticketId: id,
      senderId: session.userId,
      senderRole: isCustomer ? "CUSTOMER" : "AGENT",
      body: parsed.data.body,
      isInternalNote,
      // Pengirim otomatis dianggap sudah membaca pesannya sendiri.
      readByCustomerAt: isCustomer ? now : null,
      readByAgentAt: !isCustomer ? now : null,
    },
    include: { sender: true },
  });

  // Update meta ticket (kecuali internal note tidak menggeser alur customer).
  const ticketData: Record<string, unknown> = {};

  if (!isInternalNote) {
    ticketData.lastMessageAt = now;

    if (!isCustomer) {
      if (!ticket.firstResponseAt) ticketData.firstResponseAt = now;
      if (ticket.status === "OPEN") ticketData.status = "IN_PROGRESS";
    } else {
      // Customer membalas → aktif kembali.
      if (["WAITING_CUSTOMER", "RESOLVED", "CLOSED"].includes(ticket.status)) {
        ticketData.status = "IN_PROGRESS";
      }
    }
  }

  const updatedTicket =
    Object.keys(ticketData).length > 0
      ? await prisma.supportTicket.update({
          where: { id },
          data: ticketData,
          include: ticketInclude,
        })
      : await prisma.supportTicket.findUnique({
          where: { id },
          include: ticketInclude,
        });

  const messageDto = serializeMessage(message);
  const ticketDto = updatedTicket ? serializeTicket(updatedTicket) : null;

  // Catatan internal TIDAK boleh di-broadcast: customer ikut subscribe kanal
  // tiket, jadi kita hanya publish pesan non-internal. Pengirim tetap melihat
  // catatannya via optimistic; agent lain melihatnya saat memuat ulang.
  if (!isInternalNote) {
    await publishSupport(supportChannels.ticket(id), "message", messageDto);

    if (isCustomer) {
      // Beri tahu antrian agent + refresh list.
      await publishSupport(supportChannels.desk(), "ticket.update", ticketDto);
    } else {
      // Beri tahu customer (badge/refresh) walau tak sedang buka tiket.
      await publishSupport(
        supportChannels.customer(ticket.customerId),
        "notify",
        { type: "message", ticketId: id }
      );
    }
  }

  return NextResponse.json({
    message: messageDto,
    ticket: ticketDto,
  });
}
