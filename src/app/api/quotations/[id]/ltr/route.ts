import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "sales.ltr", action: "canCreate" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      purchaseOrder: true,
      ltr: true,
    },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (quotation.status !== "PO_UPLOADED") {
    return NextResponse.json(
      { message: "LTR hanya bisa dibuat setelah PO uploaded" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const ltr = await tx.ltr.upsert({
      where: {
        quotationId: id,
      },
      update: {},
      create: {
        quotationId: id,
        ltrNo: generateDocumentNo("LTR"),
        createdById: permission.session?.userId,
      },
    });

    const updatedQuotation = await tx.quotation.update({
      where: { id },
      data: {
        status: "LTR_CREATED",
      },
    });

    return { ltr, quotation: updatedQuotation };
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "CREATE_LTR",
      note: `LTR created for ${quotation.quotationNo}`,
    },
  });

  return NextResponse.json({
    message: "LTR berhasil dibuat",
    ...result,
  });
}