import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
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

const rateSchema = z.object({
  rating: z.coerce.number().int().min(1, "Rating minimal 1").max(5, "Rating maksimal 5"),
  ratingComment: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isCustomerSession(session)) {
    return NextResponse.json(
      { message: "Hanya customer yang dapat memberi rating" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = rateSchema.safeParse(body);

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

  if (ticket.customerId !== session.customerId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (ticket.status !== "RESOLVED") {
    return NextResponse.json(
      { message: "Rating hanya bisa diberikan saat tiket berstatus Resolved" },
      { status: 400 }
    );
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      rating: parsed.data.rating,
      ratingComment: parsed.data.ratingComment,
      status: "CLOSED",
      closedAt: new Date(),
    },
    include: ticketInclude,
  });

  const systemMessage = await prisma.supportMessage.create({
    data: {
      ticketId: id,
      senderId: session.userId,
      senderRole: "SYSTEM",
      body: `Customer memberi rating ${parsed.data.rating}/5. Tiket ditutup.`,
    },
    include: { sender: true },
  });

  const dto = serializeTicket(updated);

  await Promise.all([
    publishSupport(supportChannels.ticket(id), "ticket.update", {
      ticket: dto,
      message: serializeMessage(systemMessage),
    }),
    publishSupport(supportChannels.desk(), "ticket.update", dto),
  ]);

  return NextResponse.json({ message: "Terima kasih atas penilaiannya", ticket: dto });
}
