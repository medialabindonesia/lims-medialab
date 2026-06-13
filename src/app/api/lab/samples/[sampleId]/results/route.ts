import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const resultSchema = z.object({
  results: z
    .array(
      z.object({
        sampleParameterId: z.string().min(1),
        resultValue: z.string().min(1, "Nilai hasil wajib diisi"),
        resultNote: z.string().optional().nullable(),
      })
    )
    .min(1, "Minimal input 1 result"),
});

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "lab.enter_results",
    "canUpdate"
  );

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;
  const body = await request.json();

  const parsed = resultSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

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

  const resultMap = new Map(
    parsed.data.results.map((item) => [item.sampleParameterId, item])
  );

  const eligible = sample.parameters.filter((item) => {
    const statusOk = item.status === "IN_PROGRESS" || item.status === "RETEST";
    const hasResult = resultMap.has(item.id);

    if (permission.session?.roleCode === "LAB_ANALYST") {
      return statusOk && hasResult && item.analystId === permission.session.userId;
    }

    return statusOk && hasResult;
  });

  if (eligible.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada parameter yang bisa diinput result" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const item of eligible) {
      const result = resultMap.get(item.id);

      if (!result) continue;

      await tx.sampleParameter.update({
        where: {
          id: item.id,
        },
        data: {
          status: "ENTERED",
          resultValue: result.resultValue,
          resultNote: result.resultNote || null,
          retestReason: null,
        },
      });
    }

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
        action: "BULK_ENTER_RESULT",
        note: `Entered ${eligible.length} result(s)`,
      },
    });
  });

  return NextResponse.json({
    message: `${eligible.length} result berhasil disimpan`,
  });
}