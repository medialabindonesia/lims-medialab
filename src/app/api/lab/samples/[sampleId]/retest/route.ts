import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { captureLabResultRevision } from "@/lib/revision-audit";

const retestSchema = z.object({
  reason: z.string().min(1, "Alasan retest wajib diisi"),
});

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("lab.ask_retest", "canUpdate");

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;
  const body = await request.json();

  const parsed = retestSchema.safeParse(body);

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

  const eligible = sample.parameters.filter((item) =>
    ["ENTERED", "REVIEWED", "VERIFIED", "VALIDATED"].includes(item.status)
  );

  if (eligible.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada result yang bisa diminta retest" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await captureLabResultRevision(tx, {
      entityId: sample.id,
      action: "CREATED",
      session: permission.session!,
      request,
      changeSummary: "Baseline sebelum retest",
    });
    await tx.sampleParameter.updateMany({
      where: {
        id: {
          in: eligible.map((item) => item.id),
        },
      },
      data: {
        status: "RETEST",
        retestReason: parsed.data.reason,
        reviewedById: null,
        verifiedById: null,
        validatedById: null,
      },
    });

    await tx.sample.update({
      where: { id: sample.id },
      data: {
        status: "RETEST",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "BULK_ASK_RETEST",
        note: parsed.data.reason,
      },
    });
    await captureLabResultRevision(tx, {
      entityId: sample.id,
      action: "STATUS_TRANSITION",
      session: permission.session!,
      request,
      reason: parsed.data.reason,
      changeSummary: `${eligible.length} parameter diminta retest`,
    });
  });

  return NextResponse.json({
    message: `${eligible.length} parameter berhasil diminta retest`,
  });
}
