import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireApiPermission } from "@/lib/api-permission";
import { publishSupport, supportChannels } from "@/lib/ably";
import { isCustomerSession } from "@/lib/support-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const isCustomer = isCustomerSession(session);

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });

  if (!ticket) {
    return NextResponse.json(
      { message: "Tiket tidak ditemukan" },
      { status: 404 }
    );
  }

  if (isCustomer) {
    if (ticket.customerId !== session.customerId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const readAt = new Date();

    await prisma.supportMessage.updateMany({
      where: {
        ticketId: id,
        senderRole: "AGENT",
        isInternalNote: false,
        readByCustomerAt: null,
      },
      data: { readByCustomerAt: readAt },
    });

    // Beri tahu kanal tiket bahwa customer sudah membaca pesan agent
    // (untuk tanda "Dibaca" di sisi agent yang sedang membuka tiket).
    await publishSupport(supportChannels.ticket(id), "read", {
      reader: "CUSTOMER",
      at: readAt.toISOString(),
    });

    await publishSupport(supportChannels.customer(ticket.customerId), "notify", {
      type: "read",
      ticketId: id,
    });
  } else {
    const permission = await requireApiPermission("support.desk", "canView");
    if (!permission.allowed) return permission.response;

    const readAt = new Date();

    await prisma.supportMessage.updateMany({
      where: {
        ticketId: id,
        senderRole: "CUSTOMER",
        readByAgentAt: null,
      },
      data: { readByAgentAt: readAt },
    });

    // Beri tahu kanal tiket bahwa agent sudah membaca pesan customer
    // (untuk tanda "Dibaca" di sisi customer yang sedang membuka tiket).
    await publishSupport(supportChannels.ticket(id), "read", {
      reader: "AGENT",
      at: readAt.toISOString(),
    });

    await publishSupport(supportChannels.desk(), "read", { ticketId: id });
  }

  return NextResponse.json({ ok: true });
}
