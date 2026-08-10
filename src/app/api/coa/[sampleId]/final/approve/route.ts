import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

/**
 * Approval Final COA sengaja dipisah dari pembuatannya (final/route.ts) dan
 * mewajibkan approver berbeda dari creator — meniru prinsip maker-checker di
 * SOP lab: orang yang membuat dokumen tidak boleh menyetujui dokumennya
 * sendiri.
 */
export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("coa.final", "canApprove");

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      coa: true,
    },
  });

  if (!sample) {
    return NextResponse.json(
      { message: "Sample tidak ditemukan" },
      { status: 404 }
    );
  }

  const finalCoa = sample.coa.find((item) => item.type === "FINAL");

  if (!finalCoa) {
    return NextResponse.json(
      { message: "Final COA belum dibuat" },
      { status: 400 }
    );
  }

  if (finalCoa.status !== "DRAFT") {
    return NextResponse.json(
      { message: "Final COA tidak dalam status menunggu approval" },
      { status: 400 }
    );
  }

  if (finalCoa.createdById && finalCoa.createdById === permission.session?.userId) {
    return NextResponse.json(
      {
        message:
          "Final COA harus disetujui oleh user yang berbeda dari yang membuat",
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const approved = await tx.coa.update({
      where: { id: finalCoa.id },
      data: {
        status: "APPROVED",
        approvedById: permission.session?.userId,
      },
    });

    const updatedSample = await tx.sample.update({
      where: { id: sample.id },
      data: {
        status: "FINAL_COA",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "APPROVE_FINAL_COA",
        note: `Final COA ${approved.coaNo} disetujui`,
      },
    });

    return { finalCoa: approved, sample: updatedSample };
  });

  return NextResponse.json({
    message: "Final COA berhasil disetujui",
    ...result,
  });
}
