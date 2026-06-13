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
    { menuKey: "technical.coc", action: "canCreate" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      ltr: true,
      coc: true,
    },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (quotation.status !== "LTR_CREATED") {
    return NextResponse.json(
      { message: "COC hanya bisa dibuat setelah LTR created" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const coc = await tx.coc.upsert({
      where: {
        quotationId: id,
      },
      update: {},
      create: {
        quotationId: id,
        cocNo: generateDocumentNo("COC"),
        createdById: permission.session?.userId,
      },
    });

    const updatedQuotation = await tx.quotation.update({
      where: { id },
      data: {
        status: "COC_CREATED",
      },
    });

    return { coc, quotation: updatedQuotation };
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "CREATE_COC",
      note: `COC created for ${quotation.quotationNo}`,
    },
  });

  return NextResponse.json({
    message: "COC berhasil dibuat",
    ...result,
  });
}