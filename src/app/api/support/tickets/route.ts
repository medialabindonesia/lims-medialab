import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";
import { publishSupport, supportChannels } from "@/lib/ably";
import {
  computeUnreadMap,
  isCustomerSession,
  serializeTicket,
  ticketInclude,
} from "@/lib/support-server";

const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subjek minimal 3 karakter").max(160),
  message: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000),
  categoryId: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  contextType: z
    .enum(["GENERAL", "QUOTATION", "ORDER_SAMPLE", "RESULT_REVISION"])
    .default("GENERAL"),
  contextId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // ---- Customer: hanya tiket miliknya ----
  if (isCustomerSession(session)) {
    if (!session.customerId) {
      return NextResponse.json(
        { message: "Customer account belum terhubung ke master customer" },
        { status: 403 }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: session.customerId },
      include: ticketInclude,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    });

    const unread = await computeUnreadMap(
      tickets.map((t) => t.id),
      true
    );

    return NextResponse.json({
      tickets: tickets.map((t) =>
        serializeTicket(t, { unreadForCustomer: unread[t.id] ?? 0 })
      ),
    });
  }

  // ---- Agent: antrian dengan filter + pagination ----
  const permission = await requireApiPermission("support.desk", "canView");
  if (!permission.allowed) return permission.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assigned = url.searchParams.get("assigned"); // me | unassigned | all
  const q = url.searchParams.get("q")?.trim();
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize")) || 15)
  );

  const where: Prisma.SupportTicketWhereInput = {};

  if (status && status !== "ALL") {
    where.status = status as Prisma.SupportTicketWhereInput["status"];
  }
  if (priority && priority !== "ALL") {
    where.priority = priority as Prisma.SupportTicketWhereInput["priority"];
  }
  if (assigned === "me") {
    where.assignedToId = session.userId;
  } else if (assigned === "unassigned") {
    where.assignedToId = null;
  }
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { ticketNo: { contains: q } },
      { customer: { name: { contains: q } } },
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    };
  }

  // Jalankan paralel: memangkas satu round-trip penuh dibanding query berurutan
  // (penting karena latensi DB remote bisa 1-2.5s+ per round trip).
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: ticketInclude,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supportTicket.count({ where }),
  ]);

  const unread = await computeUnreadMap(
    tickets.map((t) => t.id),
    false
  );

  return NextResponse.json({
    tickets: tickets.map((t) =>
      serializeTicket(t, { unreadForAgent: unread[t.id] ?? 0 })
    ),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isCustomerSession(session)) {
    return NextResponse.json(
      { message: "Hanya customer yang dapat membuat tiket" },
      { status: 403 }
    );
  }

  if (!session.customerId) {
    return NextResponse.json(
      { message: "Customer account belum terhubung ke master customer" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const now = new Date();
  let quotationId: string | null = null;
  let sampleId: string | null = null;
  let revisionId: string | null = null;
  let contextLabel: string | null = "Pertanyaan umum";

  if (parsed.data.contextType === "QUOTATION") {
    const quotation = await prisma.quotation.findFirst({
      where: { id: parsed.data.contextId || "", customerId: session.customerId },
      select: { id: true, quotationNo: true },
    });
    if (!quotation) {
      return NextResponse.json(
        { message: "Quotation tidak ditemukan atau bukan milik customer" },
        { status: 400 }
      );
    }
    quotationId = quotation.id;
    contextLabel = quotation.quotationNo;
  }

  if (parsed.data.contextType === "ORDER_SAMPLE") {
    const sample = await prisma.sample.findFirst({
      where: { id: parsed.data.contextId || "", customerId: session.customerId },
      select: { id: true, sampleNo: true, quotationId: true },
    });
    if (!sample) {
      return NextResponse.json(
        { message: "Pesanan/sample tidak ditemukan atau bukan milik customer" },
        { status: 400 }
      );
    }
    sampleId = sample.id;
    quotationId = sample.quotationId;
    contextLabel = sample.sampleNo;
  }

  if (parsed.data.contextType === "RESULT_REVISION") {
    const revision = await prisma.auditRevision.findFirst({
      where: {
        id: parsed.data.contextId || "",
        entityType: "LAB_RESULT",
      },
    });
    if (!revision) {
      return NextResponse.json(
        { message: "Revisi hasil tidak ditemukan" },
        { status: 400 }
      );
    }
    const sample = await prisma.sample.findFirst({
      where: { id: revision.entityId, customerId: session.customerId },
      select: { id: true, sampleNo: true, quotationId: true },
    });
    if (!sample) {
      return NextResponse.json(
        { message: "Revisi hasil bukan milik customer" },
        { status: 403 }
      );
    }
    revisionId = revision.id;
    sampleId = sample.id;
    quotationId = sample.quotationId;
    contextLabel = `${sample.sampleNo} · Revisi ${revision.revisionNo}`;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNo: generateDocumentNo("TKT"),
      customerId: session.customerId,
      categoryId: parsed.data.categoryId,
      createdById: session.userId,
      subject: parsed.data.subject,
      status: "OPEN",
      priority: "NORMAL",
      contextType: parsed.data.contextType,
      contextLabel,
      quotationId,
      sampleId,
      revisionId,
      lastMessageAt: now,
      messages: {
        create: {
          senderId: session.userId,
          senderRole: "CUSTOMER",
          body: parsed.data.message,
        },
      },
    },
    include: ticketInclude,
  });

  const dto = serializeTicket(ticket, { unreadForAgent: 1 });

  // Beri tahu antrian agent bahwa ada tiket baru.
  await publishSupport(supportChannels.desk(), "ticket.new", dto);

  return NextResponse.json({
    message: "Tiket berhasil dibuat",
    ticket: dto,
  });
}
