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

  // Dokumen aktif memakai harga paket per grup. Quotation lama tanpa grup
  // tetap diperiksa pada harga parameter agar kompatibel.
  const [unpricedPackages, unpricedItems, unpricedCharges] = await Promise.all([
    prisma.quotationGroup.count({
      where: { quotationId: id, pricingMode: "PACKAGE", unitPrice: null },
    }),
    prisma.quotationItem.count({
      where: {
        quotationId: id,
        price: null,
        OR: [{ groupId: null }, { group: { pricingMode: "ITEM" } }],
      },
    }),
    prisma.quotationChargeItem.count({
      where: { quotationId: id, unitPrice: null },
    }),
  ]);
  const unpricedCount = unpricedPackages + unpricedItems + unpricedCharges;

  if (unpricedCount > 0) {
    return NextResponse.json(
      {
        message: `${PRICING_GATE_MESSAGE} (${unpricedCount} paket/biaya belum berharga)`,
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
