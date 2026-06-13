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
    "lab.review_results",
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

  if (sampleParameter.status !== "ENTERED") {
    return NextResponse.json(
      { message: "Hanya result ENTERED yang bisa direview" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.sampleParameter.update({
      where: { id },
      data: {
        status: "REVIEWED",
        reviewedById: permission.session?.userId,
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

    const allParameters = await tx.sampleParameter.findMany({
      where: {
        sampleId: sampleParameter.sampleId,
      },
    });

    const allReviewed = allParameters.every((item) =>
      ["REVIEWED", "VERIFIED", "VALIDATED"].includes(item.status)
    );

    if (allReviewed) {
      await tx.sample.update({
        where: {
          id: sampleParameter.sampleId,
        },
        data: {
          status: "REVIEWED",
        },
      });
    }

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sampleParameter.sampleId,
        action: "REVIEW_RESULT",
        note: `Result reviewed for ${sampleParameter.parameter.name}`,
      },
    });

    return result;
  });

  return NextResponse.json({
    message: "Result berhasil direview",
    sampleParameter: updated,
  });
}