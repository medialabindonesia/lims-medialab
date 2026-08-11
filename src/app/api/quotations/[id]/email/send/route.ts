import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import {
  getEmailDeliveryConfiguration,
  sendTransactionalEmail,
} from "@/lib/email-delivery";
import { customerIdentityText } from "@/lib/quotation-email";
import { renderQuotationPdfBuffer } from "@/lib/exports/pdf/render-quotation-pdf";
import { safeFileName } from "@/lib/exports/format";
import { getQuotationDocumentConfig } from "@/lib/exports/quotation-document-config";
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
      items: {
        orderBy: [{ sort: "asc" }, { id: "asc" }],
        include: {
          parameter: true,
          duration: true,
          regulationParameter: true,
        },
      },
      groups: {
        include: {
          matrix: true,
          regulation: true,
          regulationLinks: {
            include: { regulation: true },
            orderBy: { sort: "asc" },
          },
          locations: { orderBy: { sort: "asc" } },
          items: {
            orderBy: [{ sort: "asc" }, { id: "asc" }],
            include: {
              parameter: true,
              duration: true,
              regulationParameter: true,
            },
          },
        },
        orderBy: { sort: "asc" },
      },
      chargeItems: { orderBy: [{ category: "asc" }, { sort: "asc" }] },
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

  const deliveryConfiguration = getEmailDeliveryConfiguration();
  if (!deliveryConfiguration.ready) {
    return NextResponse.json(
      {
        message: `Pengiriman email belum dikonfigurasi. Isi ${deliveryConfiguration.missing.join(
          " dan "
        )}.`,
        missing: deliveryConfiguration.missing,
      },
      { status: 503 }
    );
  }

  const documentConfiguration = getQuotationDocumentConfig();
  if (!documentConfiguration.ready) {
    return NextResponse.json(
      {
        message:
          "Identitas resmi surat penawaran belum lengkap. Hubungi IT/Manajemen untuk melengkapi konfigurasi dokumen.",
        missing: documentConfiguration.missing,
      },
      { status: 503 }
    );
  }

  const draft = await prisma.quotationEmail.findFirst({
    where: { id: parsed.data.draftId, quotationId: id, status: "DRAFT" },
  });
  if (!draft) {
    return NextResponse.json(
      { message: "Draft email tidak tersedia atau sudah sedang dikirim" },
      { status: 409 }
    );
  }

  // Lease pada quotation mencegah dua tab/user mengirim dua draft berbeda
  // pada saat yang sama. Lease kedaluwarsa agar crash proses tidak mengunci
  // quotation selamanya.
  const leaseExpiredBefore = new Date(Date.now() - 10 * 60 * 1000);
  const quotationClaimed = await prisma.quotation.updateMany({
    where: {
      id,
      status: "APPROVED",
      OR: [
        { emailSendLock: null },
        { emailSendLockedAt: { lt: leaseExpiredBefore } },
      ],
    },
    data: {
      emailSendLock: draft.id,
      emailSendLockedAt: new Date(),
    },
  });
  if (quotationClaimed.count !== 1) {
    return NextResponse.json(
      { message: "Quotation ini sudah sedang dikirim dari sesi lain" },
      { status: 409 }
    );
  }

  // Klaim atomik: dua klik/request bersamaan tidak boleh sama-sama mengirim.
  const claimed = await prisma.quotationEmail.updateMany({
    where: { id: draft.id, quotationId: id, status: "DRAFT" },
    data: { status: "SENDING", lastError: null },
  });
  if (claimed.count !== 1) {
    await prisma.quotation.updateMany({
      where: { id, emailSendLock: draft.id },
      data: { emailSendLock: null, emailSendLockedAt: null },
    });
    return NextResponse.json(
      { message: "Email ini sudah sedang diproses" },
      { status: 409 }
    );
  }

  try {
    const actorIds = [quotation.requestedById, quotation.approvedById].filter(
      (value): value is string => Boolean(value)
    );
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const documentQuotation = {
      ...quotation,
      requestedBy: quotation.requestedById
        ? actorById.get(quotation.requestedById) || null
        : null,
      approvedBy: quotation.approvedById
        ? actorById.get(quotation.approvedById) || null
        : null,
    };
    const pdf = await renderQuotationPdfBuffer(documentQuotation);
    const identity = Buffer.from(customerIdentityText(quotation.customer), "utf8");
    const quotationFileName = `${safeFileName(quotation.quotationNo)}-quotation.pdf`;
    const identityFileName = `${safeFileName(
      quotation.customer.customerCode || quotation.customer.name
    )}-identitas.txt`;
    const ccEmails = Array.isArray(draft.ccEmails)
      ? (draft.ccEmails as string[])
      : [];
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          quotationId: quotation.id,
          document: {
            quotationNo: quotation.quotationNo,
            customerId: quotation.customerId,
            quotationDate: quotation.quotationDate,
            validUntil: quotation.validUntil,
            note: quotation.note,
            tatRequested: quotation.tatRequested,
            tatBusinessDays: quotation.tatBusinessDays,
            totalAmount: quotation.totalAmount,
            samplingCost: quotation.samplingCost,
            additionalCost: quotation.additionalCost,
            discountAmount: quotation.discountAmount,
            vatPercent: quotation.vatPercent,
            grandTotal: quotation.grandTotal,
            groups: quotation.groups.map((group) => ({
              description: group.description,
              qty: group.qty,
              pricingMode: group.pricingMode,
              unitPrice: group.unitPrice,
              regulationIds: group.regulationLinks.map(
                (link) => link.regulationId
              ),
              locations: group.locations.map((location) => ({
                label: location.label,
                customerSampleId: location.customerSampleId,
              })),
              items: group.items.map((item) => ({
                parameterId: item.parameterId,
                sort: item.sort,
                regulationParameterId: item.regulationParameterId,
                durationId: item.durationId,
                method: item.method,
              })),
            })),
            charges: quotation.chargeItems.map((item) => ({
              category: item.category,
              description: item.description,
              detail: item.detail,
              qty: item.qty,
              unit: item.unit,
              unitPrice: item.unitPrice,
            })),
          },
          customerUpdatedAt: quotation.customer.updatedAt,
          from: deliveryConfiguration.from,
          replyTo: deliveryConfiguration.replyTo,
          to: draft.toEmail,
          cc: ccEmails,
          subject: draft.subject,
          body: draft.bodyText,
        })
      )
      .digest("hex");
    const result = await sendTransactionalEmail({
      to: draft.toEmail,
      cc: ccEmails,
      subject: draft.subject,
      text: draft.bodyText,
      attachments: [
        { filename: quotationFileName, content: pdf.toString("base64") },
        { filename: identityFileName, content: identity.toString("base64") },
      ],
      idempotencyKey: `quotation-email/${quotation.id}/${fingerprint}`,
    });

    await prisma.$transaction(async (tx) => {
      await tx.quotationEmail.update({
        where: { id: draft.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentById: permission.session?.userId,
          providerMessageId: result.providerMessageId,
          attachmentManifest: [quotationFileName, identityFileName],
        },
      });
      await tx.quotation.update({
        where: { id },
        data: {
          status: "SENT",
          emailSendLock: null,
          emailSendLockedAt: null,
        },
      });
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
    await prisma.$transaction([
      prisma.quotationEmail.update({
        where: { id: draft.id },
        data: { status: "FAILED", lastError: message },
      }),
      prisma.quotation.updateMany({
        where: { id, emailSendLock: draft.id },
        data: { emailSendLock: null, emailSendLockedAt: null },
      }),
    ]);
    return NextResponse.json({ message }, { status: 503 });
  }
}
