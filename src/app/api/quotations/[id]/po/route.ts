import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

const poSchema = z.object({
  poNumber: z.string().min(1, "Nomor PO wajib diisi"),
  fileUrl: z.string().optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
    { menuKey: "quotation.approve", action: "canUpdate" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = poSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Data PO tidak valid",
      },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      purchaseOrder: true,
    },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (quotation.status !== "APPROVED") {
    return NextResponse.json(
      { message: "PO hanya bisa diupload setelah quotation APPROVED" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.upsert({
      where: {
        quotationId: id,
      },
      update: {
        poNumber: parsed.data.poNumber,
        fileUrl: parsed.data.fileUrl || null,
      },
      create: {
        quotationId: id,
        customerId: quotation.customerId,
        poNumber: parsed.data.poNumber,
        fileUrl: parsed.data.fileUrl || null,
      },
    });

    const updatedQuotation = await tx.quotation.update({
      where: { id },
      data: {
        status: "PO_UPLOADED",
      },
    });

    return { po, quotation: updatedQuotation };
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "UPLOAD_PO",
      note: `PO ${parsed.data.poNumber} uploaded for ${quotation.quotationNo}`,
    },
  });

  return NextResponse.json({
    message: "PO berhasil disimpan",
    ...result,
  });
}