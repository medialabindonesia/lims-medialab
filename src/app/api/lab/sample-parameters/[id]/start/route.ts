import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "lab.conduct_analysis",
    "canUpdate"
  );

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const sampleParameter = await prisma.sampleParameter.findUnique({
    where: { id },
    include: {
      sample: true,
      parameter: true,
    },
  });

  if (!sampleParameter) {
    return NextResponse.json(
      { message: "Parameter sample tidak ditemukan" },
      { status: 404 }
    );
  }

  if (
    permission.session?.roleCode === "LAB_ANALYST" &&
    sampleParameter.analystId !== permission.session.userId
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (
    sampleParameter.status !== "WAITING" &&
    sampleParameter.status !== "RETEST"
  ) {
    return NextResponse.json(
      { message: "Parameter hanya bisa dimulai dari status WAITING / RETEST" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.sampleParameter.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
      },
      include: {
        parameter: true,
        templateParameter: true,
        sample: {
          include: {
            customer: true,
            quotation: true,
            coaTemplate: true,
          },
        },
      },
    });

    await tx.sample.update({
      where: {
        id: sampleParameter.sampleId,
      },
      data: {
        status: "IN_ANALYSIS",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sampleParameter.sampleId,
        action: "START_ANALYSIS",
        note: `Start analysis for ${sampleParameter.parameter.name}`,
      },
    });

    return result;
  });

  return NextResponse.json({
    message: "Analisis berhasil dimulai",
    sampleParameter: updated,
  });
}