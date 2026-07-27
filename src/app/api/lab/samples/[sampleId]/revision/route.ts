import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { captureLabResultRevision } from "@/lib/revision-audit";

const revisionSchema = z.object({
  reason: z.string().trim().min(8, "Alasan revisi minimal 8 karakter").max(1000),
  sourceTicketId: z.string().optional().nullable(),
  parameters: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().trim().max(200).optional().nullable(),
      unit: z.string().trim().max(100).optional().nullable(),
      method: z.string().trim().max(250).optional().nullable(),
      standard: z.string().trim().max(500).optional().nullable(),
      limit: z.string().trim().max(500).optional().nullable(),
    })
  ).min(1),
});

type RouteContext = { params: Promise<{ sampleId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("audit.revisions", "canUpdate");
  if (!permission.allowed) return permission.response;

  const parsed = revisionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }
  const { sampleId } = await context.params;

  const revision = await prisma.$transaction(async (tx) => {
    const sample = await tx.sample.findUnique({
      where: { id: sampleId },
      include: { parameters: true },
    });
    if (!sample) throw new Error("SAMPLE_NOT_FOUND");

    // Simpan baseline sebelum perubahan pertama agar rollback benar-benar mungkin.
    await captureLabResultRevision(tx, {
      entityId: sampleId,
      action: "CREATED",
      session: permission.session!,
      request,
      changeSummary: "Baseline sebelum revisi metadata hasil",
    });

    const allowed = new Set(sample.parameters.map((item) => item.id));
    for (const item of parsed.data.parameters) {
      if (!allowed.has(item.id)) throw new Error("PARAMETER_INVALID");
      await tx.sampleParameter.update({
        where: { id: item.id },
        data: {
          displayNameSnapshot: item.displayName || null,
          unitSnapshot: item.unit || null,
          methodSnapshot: item.method || null,
          standardSnapshot: item.standard || null,
          limitSnapshot: item.limit || null,
          status: "ENTERED",
          reviewedById: null,
          verifiedById: null,
          validatedById: null,
        },
      });
    }
    await tx.sample.update({
      where: { id: sampleId },
      data: { status: "IN_ANALYSIS" },
    });
    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId,
        action: "REVISE_LAB_RESULT_METADATA",
        note: parsed.data.reason,
      },
    });
    return captureLabResultRevision(tx, {
      entityId: sampleId,
      action: "UPDATED",
      session: permission.session!,
      request,
      reason: parsed.data.reason,
      sourceTicketId: parsed.data.sourceTicketId,
      changeSummary: `${parsed.data.parameters.length} parameter direvisi; approval dibuka ulang`,
    });
  });

  return NextResponse.json({
    message: `Revisi ${revision.revisionNo} tersimpan. Hasil harus review, verify, dan validate ulang.`,
    revision,
  });
}
