import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const resultSchema = z.object({
  resultValue: z.string().min(1, "Nilai hasil wajib diisi"),
  resultNote: z.string().optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "lab.enter_results",
    "canUpdate"
  );

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = resultSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

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
    sampleParameter.status !== "IN_PROGRESS" &&
    sampleParameter.status !== "RETEST"
  ) {
    return NextResponse.json(
      {
        message: "Result hanya bisa diinput saat status IN_PROGRESS / RETEST",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.sampleParameter.update({
      where: { id },
      data: {
        status: "ENTERED",
        resultValue: parsed.data.resultValue,
        resultNote: parsed.data.resultNote || null,
        retestReason: null,
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
        action: "ENTER_RESULT",
        note: `Result entered for ${sampleParameter.parameter.name}`,
      },
    });

    return result;
  });

  return NextResponse.json({
    message: "Result berhasil diinput",
    sampleParameter: updated,
  });
}