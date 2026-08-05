import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { captureQuotationRevision } from "@/lib/revision-audit";

const revisionSchema = z.object({
  note: z.string().min(1, "Catatan revisi wajib diisi"),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = revisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Catatan revisi wajib diisi",
      },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    quotation.customerId !== permission.session.customerId
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (quotation.status !== "REQUESTED" && quotation.status !== "NEGOTIATION") {
    return NextResponse.json(
      {
        message:
          "Customer hanya bisa minta revisi saat quotation masih REQUESTED / NEGOTIATION",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await captureQuotationRevision(tx, {
      entityId: id,
      action: "CREATED",
      session: permission.session!,
      request,
      changeSummary: "Baseline sebelum permintaan revisi customer",
    });
    const result = await tx.quotation.update({
      where: { id },
      data: {
        status: "REVISION",
        note: parsed.data.note,
        revisionReason: parsed.data.note,
      },
    });
    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        action: "CUSTOMER_REQUEST_QUOTATION_REVISION",
        note: parsed.data.note,
      },
    });
    await captureQuotationRevision(tx, {
      entityId: id,
      action: "STATUS_TRANSITION",
      session: permission.session!,
      request,
      reason: parsed.data.note,
      changeSummary: "Customer meminta revisi quotation",
    });
    return result;
  });

  return NextResponse.json({
    message: "Revisi quotation berhasil diminta customer",
    quotation: updated,
  });
}
