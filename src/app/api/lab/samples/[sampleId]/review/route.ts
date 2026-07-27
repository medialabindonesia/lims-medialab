import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { captureLabResultRevision } from "@/lib/revision-audit";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "lab.review_results",
    "canUpdate"
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

  const eligible = sample.parameters.filter((item) => item.status === "ENTERED");

  if (eligible.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada result ENTERED untuk direview" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await captureLabResultRevision(tx, {
      entityId: sample.id,
      action: "CREATED",
      session: permission.session!,
      request,
      changeSummary: "Baseline sebelum review hasil",
    });
    await tx.sampleParameter.updateMany({
      where: {
        id: {
          in: eligible.map((item) => item.id),
        },
      },
      data: {
        status: "REVIEWED",
        reviewedById: permission.session?.userId || null,
      },
    });

    const allParams = await tx.sampleParameter.findMany({
      where: {
        sampleId: sample.id,
      },
    });

    const allReviewed = allParams.every((item) =>
      ["REVIEWED", "VERIFIED", "VALIDATED"].includes(item.status)
    );

    if (allReviewed) {
      await tx.sample.update({
        where: { id: sample.id },
        data: {
          status: "REVIEWED",
        },
      });
    }

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "BULK_REVIEW_RESULT",
        note: `Reviewed ${eligible.length} result(s)`,
      },
    });
    await captureLabResultRevision(tx, {
      entityId: sample.id,
      action: "STATUS_TRANSITION",
      session: permission.session!,
      request,
      changeSummary: `${eligible.length} hasil direview`,
    });
  });

  return NextResponse.json({
    message: `${eligible.length} result berhasil direview`,
  });
}
