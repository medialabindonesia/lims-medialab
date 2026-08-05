import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { captureQuotationRevision } from "@/lib/revision-audit";

const rejectSchema = z.object({
  reason: z.string().trim().min(8, "Catatan penolakan minimal 8 karakter").max(1000),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.approve", action: "canApprove" },
  ]);
  if (!permission.allowed) return permission.response;

  const parsed = rejectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Catatan penolakan wajib diisi" },
      { status: 400 }
    );
  }
  const { id } = await context.params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) {
    return NextResponse.json({ message: "Quotation tidak ditemukan" }, { status: 404 });
  }
  if (quotation.status !== "VERIFIED") {
    return NextResponse.json(
      { message: "Hanya quotation VERIFIED yang dapat ditolak" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.quotation.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason,
        approvedById: null,
      },
    });
    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        action: "REJECT_QUOTATION",
        note: `${quotation.quotationNo} ditolak manager: ${parsed.data.reason}`,
      },
    });
    await captureQuotationRevision(tx, {
      entityId: id,
      action: "STATUS_TRANSITION",
      session: permission.session!,
      request,
      reason: parsed.data.reason,
      changeSummary: "Quotation ditolak manager dan dikembalikan ke sales staff",
    });
    return result;
  });

  return NextResponse.json({
    message: "Quotation ditolak dan catatan revisi dikirim ke sales staff",
    quotation: updated,
  });
}
