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
    "lab.conduct_analysis",
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

  const eligible = sample.parameters.filter((item) => {
    const statusOk = item.status === "WAITING" || item.status === "RETEST";

    if (permission.session?.roleCode === "LAB_ANALYST") {
      return statusOk && item.analystId === permission.session.userId;
    }

    return statusOk;
  });

  if (eligible.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada parameter yang bisa dimulai" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await captureLabResultRevision(tx, {
      entityId: sample.id,
      action: "CREATED",
      session: permission.session!,
      request,
      changeSummary: "Baseline sebelum analisis dimulai",
    });
    await tx.sampleParameter.updateMany({
      where: {
        id: {
          in: eligible.map((item) => item.id),
        },
      },
      data: {
        status: "IN_PROGRESS",
      },
    });

    await tx.sample.update({
      where: { id: sample.id },
      data: {
        status: "IN_ANALYSIS",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "BULK_START_ANALYSIS",
        note: `Started ${eligible.length} parameter(s)`,
      },
    });
    await captureLabResultRevision(tx, {
      entityId: sample.id,
      action: "STATUS_TRANSITION",
      session: permission.session!,
      request,
      changeSummary: `${eligible.length} parameter mulai dianalisis`,
    });
  });

  return NextResponse.json({
    message: `${eligible.length} parameter berhasil dimulai`,
  });
}
