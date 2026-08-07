import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { captureQuotationRevision } from "@/lib/revision-audit";
import { PRICING_GATE_MESSAGE } from "@/lib/order-code";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.approve", action: "canApprove" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (quotation.status !== "VERIFIED") {
    return NextResponse.json(
      { message: "Hanya quotation VERIFIED yang bisa diapprove" },
      { status: 400 }
    );
  }

  // Gerbang harga: sales boleh menyusun dan mengirim scope tanpa harga, tetapi
  // quotation tidak boleh melewati APPROVED selama masih ada harga kosong.
  // Dihitung ulang dari item, bukan sekadar percaya kolom pricingStatus,
  // agar tetap benar untuk data yang diubah lewat jalur lain.
  const unpricedCount = await prisma.quotationItem.count({
    where: { quotationId: id, price: null },
  });

  if (unpricedCount > 0) {
    return NextResponse.json(
      {
        message: `${PRICING_GATE_MESSAGE} (${unpricedCount} parameter belum berharga)`,
        unpricedCount,
      },
      { status: 409 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.quotation.update({
      where: { id },
      data: {
        status: "APPROVED",
        // Sudah dipastikan tidak ada item tanpa harga di atas.
        pricingStatus: "PRICED",
        approvedById: permission.session?.userId,
        rejectionReason: null,
      },
    });
    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        action: "APPROVE_QUOTATION",
        note: `Quotation ${quotation.quotationNo} approved`,
      },
    });
    await captureQuotationRevision(tx, {
      entityId: id,
      action: "STATUS_TRANSITION",
      session: permission.session!,
      request,
      changeSummary: "Quotation disetujui manager",
    });
    return result;
  });

  return NextResponse.json({
    message: "Quotation berhasil diapprove",
    quotation: updated,
  });
}
