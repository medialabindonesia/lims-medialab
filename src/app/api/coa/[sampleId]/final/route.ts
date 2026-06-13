import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "coa.final", action: "canCreate" },
    { menuKey: "coa.final", action: "canApprove" },
  ]);

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      coa: true,
      parameters: true,
    },
  });

  if (!sample) {
    return NextResponse.json(
      { message: "Sample tidak ditemukan" },
      { status: 404 }
    );
  }

  const preliminary = sample.coa.find((item) => item.type === "PRELIMINARY");

  if (!preliminary) {
    return NextResponse.json(
      { message: "Preliminary COA belum dibuat" },
      { status: 400 }
    );
  }

  if (preliminary.status !== "CUSTOMER_CONFIRMED") {
    return NextResponse.json(
      { message: "Final COA hanya bisa dibuat setelah customer confirm preliminary COA" },
      { status: 400 }
    );
  }

  const allValidated = sample.parameters.every(
    (item) => item.status === "VALIDATED"
  );

  if (!allValidated) {
    return NextResponse.json(
      { message: "Semua parameter harus VALIDATED dulu" },
      { status: 400 }
    );
  }

  const existingFinal = sample.coa.find((item) => item.type === "FINAL");

  const result = await prisma.$transaction(async (tx) => {
    const finalCoa = existingFinal
      ? await tx.coa.update({
          where: { id: existingFinal.id },
          data: {
            status: "APPROVED",
            approvedById: permission.session?.userId,
          },
        })
      : await tx.coa.create({
          data: {
            coaNo: generateDocumentNo("FINAL-COA"),
            sampleId: sample.id,
            type: "FINAL",
            status: "APPROVED",
            createdById: permission.session?.userId,
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
        action: "CREATE_FINAL_COA",
        note: `Final COA ${finalCoa.coaNo} created`,
      },
    });

    return { finalCoa, sample: updatedSample };
  });

  return NextResponse.json({
    message: "Final COA berhasil dibuat",
    ...result,
  });
}