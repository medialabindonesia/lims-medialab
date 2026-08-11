import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { defaultQuotationEmail } from "@/lib/quotation-email";
import { getEmailDeliveryConfiguration } from "@/lib/email-delivery";
import { getQuotationDocumentConfig } from "@/lib/exports/quotation-document-config";

const emailSchema = z.object({
  draftId: z.string().optional().nullable(),
  toEmail: z.string().email("Alamat email customer tidak valid").max(191),
  ccEmails: z
    .array(z.string().email("Alamat CC tidak valid").max(191))
    .max(20, "Maksimal 20 alamat CC")
    .default([])
    .transform((items) => [...new Set(items.map((item) => item.toLowerCase()))]),
  subject: z
    .string()
    .trim()
    .min(3, "Subjek email wajib diisi")
    .max(191, "Subjek maksimal 191 karakter"),
  bodyText: z
    .string()
    .trim()
    .min(10, "Isi email terlalu pendek")
    .max(100_000, "Isi email terlalu panjang"),
});

type RouteContext = { params: Promise<{ id: string }> };

async function authorize() {
  return requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
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
  const delivery = getEmailDeliveryConfiguration();
  const documentConfig = getQuotationDocumentConfig();
  return NextResponse.json({
    quotationStatus: quotation.status,
    emailDelivery: {
      provider: delivery.provider,
      ready: delivery.ready && documentConfig.ready,
      missing: [...delivery.missing, ...documentConfig.missing],
    },
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
        // Draft FAILED sengaja tidak ditimpa. Payload yang berubah harus
        // mendapat id baru agar kunci idempotensi provider juga baru.
        where: { id: parsed.data.draftId, quotationId: id, status: "DRAFT" },
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
