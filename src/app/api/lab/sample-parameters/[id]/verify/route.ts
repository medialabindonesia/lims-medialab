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
    "lab.verify_results",
    "canValidate"
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

  if (sampleParameter.status !== "REVIEWED") {
    return NextResponse.json(
      { message: "Hanya result REVIEWED yang bisa diverifikasi" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.sampleParameter.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedById: permission.session?.userId,
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

    const allVerified = allParameters.every((item) =>
      ["VERIFIED", "VALIDATED"].includes(item.status)
    );

    if (allVerified) {
      await tx.sample.update({
        where: {
          id: sampleParameter.sampleId,
        },
        data: {
          status: "VERIFIED",
        },
      });
    }

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sampleParameter.sampleId,
        action: "VERIFY_RESULT",
        note: `Result verified for ${sampleParameter.parameter.name}`,
      },
    });

    return result;
  });

  return NextResponse.json({
    message: "Result berhasil diverifikasi",
    sampleParameter: updated,
  });
}