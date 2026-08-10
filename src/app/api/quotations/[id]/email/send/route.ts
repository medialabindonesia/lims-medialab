import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { sendTransactionalEmail } from "@/lib/email-delivery";
import { customerIdentityText } from "@/lib/quotation-email";
import { renderQuotationPdfBuffer } from "@/lib/exports/pdf/render-quotation-pdf";
import { safeFileName } from "@/lib/exports/format";
import { captureQuotationRevision } from "@/lib/revision-audit";

export const runtime = "nodejs";

const bodySchema = z.object({ draftId: z.string().min(1) });
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
  ]);
  if (!permission.allowed) return permission.response;
  if (permission.session?.roleCode === "CUSTOMER_ENGAGEMENT") {
    return NextResponse.json({ message: "Pengiriman quotation hanya untuk tim sales" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Simpan draft sebelum mengirim" }, { status: 400 });
  }

  const { id } = await context.params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      coaTemplate: true,
      items: { include: { parameter: true } },
      groups: {
        include: {
          matrix: true,
          regulation: true,
          locations: { orderBy: { sort: "asc" } },
          items: { include: { parameter: true, duration: true } },
        },
        orderBy: { sort: "asc" },
      },
      purchaseOrder: true,
      ltr: true,
      coc: { include: { sample: true } },
      stps: true,
      invoice: true,
      samples: { include: { coa: true, coaTemplate: true } },
    },
  });
  if (!quotation) {
    return NextResponse.json({ message: "Quotation tidak ditemukan" }, { status: 404 });
  }
  if (quotation.status !== "APPROVED") {
    return NextResponse.json(
      { message: "Quotation hanya dapat dikirim setelah manager approve" },
      { status: 409 }
    );
  }

  const draft = await prisma.quotationEmail.findFirst({
    where: { id: parsed.data.draftId, quotationId: id, status: { in: ["DRAFT", "FAILED"] } },
  });
  if (!draft) {
    return NextResponse.json({ message: "Draft email tidak ditemukan" }, { status: 404 });
  }

  await prisma.quotationEmail.update({ where: { id: draft.id }, data: { status: "SENDING", lastError: null } });

  try {
    const pdf = await renderQuotationPdfBuffer(quotation);
    const identity = Buffer.from(customerIdentityText(quotation.customer), "utf8");
    const result = await sendTransactionalEmail({
      to: draft.toEmail,
      cc: Array.isArray(draft.ccEmails) ? (draft.ccEmails as string[]) : [],
      subject: draft.subject,
      text: draft.bodyText,
      attachments: [
        { filename: `${safeFileName(quotation.quotationNo)}-quotation.pdf`, content: pdf.toString("base64") },
        { filename: `${safeFileName(quotation.customer.customerCode || quotation.customer.name)}-identitas.txt`, content: identity.toString("base64") },
      ],
    });

    await prisma.$transaction(async (tx) => {
      await tx.quotationEmail.update({
        where: { id: draft.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentById: permission.session?.userId,
          providerMessageId: result.providerMessageId,
          attachmentManifest: ["quotation.pdf", "identitas-customer.txt"],
        },
      });
      await tx.quotation.update({ where: { id }, data: { status: "SENT" } });
      await tx.workflowLog.create({
        data: {
          actorId: permission.session?.userId,
          action: "SEND_QUOTATION_EMAIL",
          note: `Quotation ${quotation.quotationNo} dikirim ke ${draft.toEmail}`,
        },
      });
      await captureQuotationRevision(tx, {
        entityId: id,
        action: "STATUS_TRANSITION",
        session: permission.session!,
        request,
        changeSummary: `Quotation dikirim ke ${draft.toEmail}`,
      });
    });

    return NextResponse.json({ message: "Quotation dan attachment berhasil dikirim" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pengiriman email gagal";
    await prisma.quotationEmail.update({
      where: { id: draft.id },
      data: { status: "FAILED", lastError: message },
    });
    return NextResponse.json({ message }, { status: 503 });
  }
}
