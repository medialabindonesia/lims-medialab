import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { defaultQuotationEmail } from "@/lib/quotation-email";

const emailSchema = z.object({
  draftId: z.string().optional().nullable(),
  toEmail: z.string().email("Alamat email customer tidak valid"),
  ccEmails: z.array(z.string().email("Alamat CC tidak valid")).default([]),
  subject: z.string().trim().min(3, "Subjek email wajib diisi"),
  bodyText: z.string().trim().min(10, "Isi email terlalu pendek"),
});

type RouteContext = { params: Promise<{ id: string }> };

async function authorize() {
  return requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
    { menuKey: "quotation.approve", action: "canUpdate" },
  ]);
}

export async function GET(_request: Request, context: RouteContext) {
  const permission = await authorize();
  if (!permission.allowed) return permission.response;
  if (permission.session?.roleCode === "CUSTOMER_ENGAGEMENT") {
    return NextResponse.json({ message: "Draft email quotation hanya untuk tim internal" }, { status: 403 });
  }

  const { id } = await context.params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      emailDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!quotation) {
    return NextResponse.json({ message: "Quotation tidak ditemukan" }, { status: 404 });
  }

  const latest = quotation.emailDrafts[0];
  return NextResponse.json({
    quotationStatus: quotation.status,
    draft: latest
      ? { ...latest, ccEmails: Array.isArray(latest.ccEmails) ? latest.ccEmails : [] }
      : { id: null, status: "DRAFT", ...defaultQuotationEmail(quotation) },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const permission = await authorize();
  if (!permission.allowed) return permission.response;
  if (permission.session?.roleCode === "CUSTOMER_ENGAGEMENT") {
    return NextResponse.json({ message: "Draft email quotation hanya untuk tim internal" }, { status: 403 });
  }

  const parsed = emailSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Draft email tidak valid" },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) {
    return NextResponse.json({ message: "Quotation tidak ditemukan" }, { status: 404 });
  }
  if (quotation.status !== "APPROVED") {
    return NextResponse.json(
      { message: "Draft pengiriman hanya dapat disimpan setelah manager approve" },
      { status: 409 }
    );
  }

  const data = {
    toEmail: parsed.data.toEmail,
    ccEmails: parsed.data.ccEmails,
    subject: parsed.data.subject,
    bodyText: parsed.data.bodyText,
    status: "DRAFT" as const,
    lastError: null,
  };
  const ownedDraft = parsed.data.draftId
    ? await prisma.quotationEmail.findFirst({
        where: { id: parsed.data.draftId, quotationId: id, status: { in: ["DRAFT", "FAILED"] } },
        select: { id: true },
      })
    : null;
  const draft = ownedDraft
    ? await prisma.quotationEmail.update({ where: { id: ownedDraft.id }, data })
    : await prisma.quotationEmail.create({
        data: { quotationId: id, createdById: permission.session?.userId, ...data },
      });

  return NextResponse.json({ message: "Draft email tersimpan", draft });
}
