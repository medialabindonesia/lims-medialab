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
  attachmentKind,
  isAllowedSupportFile,
  safeSupportFileName,
} from "@/lib/support-attachments";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const messageSchema = z.object({
  body: z.string().trim().max(4000).default(""),
  isInternalNote: z.boolean().optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().trim().min(1).max(255),
        mimeType: z.string().trim().min(1).max(150),
        sizeBytes: z.number().int().positive(),
        url: z.string().url(),
        downloadUrl: z.string().url().optional().nullable(),
        width: z.number().int().positive().optional().nullable(),
        height: z.number().int().positive().optional().nullable(),
        durationSeconds: z.number().positive().optional().nullable(),
        originalSizeBytes: z.number().int().positive().optional().nullable(),
        isCompressed: z.boolean().optional(),
      })
    )
    .max(8)
    .default([]),
}).refine((value) => value.body.length > 0 || value.attachments.length > 0, {
  message: "Pesan atau lampiran wajib diisi",
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
  for (const attachment of parsed.data.attachments) {
    if (
      !isAllowedSupportFile({
        type: attachment.mimeType,
        size: attachment.sizeBytes,
      })
    ) {
      return NextResponse.json(
        { message: `Lampiran ${attachment.fileName} tidak diizinkan` },
        { status: 400 }
      );
    }
    // Lampiran disimpan lokal di VPS, jadi URL-nya path relatif `/uploads/...`.
    // Pastikan klien tidak menyisipkan URL eksternal atau lampiran milik
    // ticket lain.
    const expectedPrefix = `/uploads/${encodeURIComponent(
      safeSupportFileName(id)
    )}/`;
    if (
      !attachment.url.startsWith(expectedPrefix) ||
      decodeURIComponent(attachment.url).includes("..")
    ) {
      return NextResponse.json(
        { message: "Lokasi lampiran tidak valid" },
        { status: 400 }
      );
    }
  }

  const message = await prisma.supportMessage.create({
    data: {
      ticketId: id,
      senderId: session.userId,
      senderRole: isCustomer ? "CUSTOMER" : "AGENT",
      body: parsed.data.body,
      isInternalNote,
      attachments: {
        create: parsed.data.attachments.map((item) => ({
          kind: attachmentKind(item.mimeType),
          fileName: item.fileName,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
          url: item.url,
          downloadUrl: item.downloadUrl || null,
          width: item.width || null,
          height: item.height || null,
          durationSeconds: item.durationSeconds || null,
          originalSizeBytes: item.originalSizeBytes || null,
          isCompressed: item.isCompressed || false,
        })),
      },
      // Pengirim otomatis dianggap sudah membaca pesannya sendiri.
      readByCustomerAt: isCustomer ? now : null,
      readByAgentAt: !isCustomer ? now : null,
    },
    include: { sender: true, attachments: true },
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
