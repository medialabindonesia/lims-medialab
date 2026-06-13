import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "lab.validate_results",
    "canValidate"
  );

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      parameters: true,
    },
  });

  if (!sample) {
    return NextResponse.json(
      { message: "Sample tidak ditemukan" },
      { status: 404 }
    );
  }

  const eligible = sample.parameters.filter((item) => item.status === "VERIFIED");

  if (eligible.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada result VERIFIED untuk divalidasi" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.sampleParameter.updateMany({
      where: {
        id: {
          in: eligible.map((item) => item.id),
        },
      },
      data: {
        status: "VALIDATED",
        validatedById: permission.session?.userId || null,
      },
    });

    const allParams = await tx.sampleParameter.findMany({
      where: {
        sampleId: sample.id,
      },
    });

    const allValidated = allParams.every(
      (item) => item.status === "VALIDATED"
    );

    if (allValidated) {
      await tx.sample.update({
        where: { id: sample.id },
        data: {
          status: "VALIDATED",
        },
      });
    }

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "BULK_VALIDATE_RESULT",
        note: `Validated ${eligible.length} result(s)`,
      },
    });
  });

  return NextResponse.json({
    message: `${eligible.length} result berhasil divalidasi`,
  });
}