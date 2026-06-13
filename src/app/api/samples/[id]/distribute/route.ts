import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const distributeSchema = z.object({
  assignments: z
    .array(
      z.object({
        sampleParameterId: z.string().min(1),
        analystId: z.string().min(1),
      })
    )
    .min(1, "Minimal assign 1 parameter"),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "lab.distribute_parameter",
    "canUpdate"
  );

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = distributeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const sample = await prisma.sample.findUnique({
    where: { id },
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

  if (sample.status !== "RECEIVED" && sample.status !== "DISTRIBUTED") {
    return NextResponse.json(
      { message: "Sample harus RECEIVED dulu sebelum parameter dibagi" },
      { status: 400 }
    );
  }

  const analystIds = [
    ...new Set(parsed.data.assignments.map((item) => item.analystId)),
  ];

  const analysts = await prisma.user.findMany({
    where: {
      id: {
        in: analystIds,
      },
      isActive: true,
      role: {
        code: "LAB_ANALYST",
      },
    },
  });

  if (analysts.length !== analystIds.length) {
    return NextResponse.json(
      { message: "Ada analyst yang tidak valid / bukan LAB_ANALYST" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const assignment of parsed.data.assignments) {
      await tx.sampleParameter.update({
        where: {
          id: assignment.sampleParameterId,
        },
        data: {
          analystId: assignment.analystId,
          status: "WAITING",
        },
      });
    }

    await tx.sample.update({
      where: {
        id,
      },
      data: {
        status: "DISTRIBUTED",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "DISTRIBUTE_SAMPLE_PARAMETER",
        note: `Parameters distributed for sample ${sample.sampleNo}`,
      },
    });
  });

  const updated = await prisma.sample.findUnique({
    where: { id },
    include: {
      customer: true,
      quotation: true,
      parameters: {
        include: {
          parameter: true,
        },
      },
    },
  });

  return NextResponse.json({
    message: "Parameter sample berhasil dibagi ke analyst",
    sample: updated,
  });
}