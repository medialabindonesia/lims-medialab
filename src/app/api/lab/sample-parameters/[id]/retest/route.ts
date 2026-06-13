import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const retestSchema = z.object({
  reason: z.string().min(1, "Alasan retest wajib diisi"),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("lab.ask_retest", "canUpdate");

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = retestSchema.safeParse(body);

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
    sampleParameter.status === "WAITING" ||
    sampleParameter.status === "IN_PROGRESS"
  ) {
    return NextResponse.json(
      {
        message:
          "Retest hanya bisa diminta setelah hasil sudah masuk / review / verify / validate",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.sampleParameter.update({
      where: { id },
      data: {
        status: "RETEST",
        retestReason: parsed.data.reason,
        reviewedById: null,
        verifiedById: null,
        validatedById: null,
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
        status: "RETEST",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sampleParameter.sampleId,
        action: "ASK_RETEST",
        note: parsed.data.reason,
      },
    });

    return result;
  });

  return NextResponse.json({
    message: "Retest berhasil diminta",
    sampleParameter: updated,
  });
}