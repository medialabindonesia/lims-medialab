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

    await prisma.supportMessage.updateMany({
      where: {
        ticketId: id,
        senderRole: "AGENT",
        isInternalNote: false,
        readByCustomerAt: null,
      },
      data: { readByCustomerAt: new Date() },
    });

    await publishSupport(supportChannels.customer(ticket.customerId), "notify", {
      type: "read",
      ticketId: id,
    });
  } else {
    const permission = await requireApiPermission("support.desk", "canView");
    if (!permission.allowed) return permission.response;

    await prisma.supportMessage.updateMany({
      where: {
        ticketId: id,
        senderRole: "CUSTOMER",
        readByAgentAt: null,
      },
      data: { readByAgentAt: new Date() },
    });

    await publishSupport(supportChannels.desk(), "read", { ticketId: id });
  }

  return NextResponse.json({ ok: true });
}
