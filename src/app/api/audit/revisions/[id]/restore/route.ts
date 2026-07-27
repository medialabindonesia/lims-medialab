import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import {
  captureLabResultRevision,
  captureQuotationRevision,
  type LabResultRevisionSnapshot,
  type QuotationRevisionSnapshot,
  verifyStoredRevision,
} from "@/lib/revision-audit";

const restoreSchema = z.object({
  reason: z.string().trim().min(8, "Alasan restore minimal 8 karakter").max(1000),
  sourceTicketId: z.string().trim().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("audit.revisions", "canUpdate");
  if (!permission.allowed) return permission.response;

  const parsed = restoreSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const { id } = await context.params;

  try {
    const restoredRevision = await prisma.$transaction(async (tx) => {
      const target = await tx.auditRevision.findUnique({ where: { id } });
      if (!target) throw new Error("REVISION_NOT_FOUND");
      if (!verifyStoredRevision(target)) throw new Error("INTEGRITY_FAILED");

      if (target.entityType === "QUOTATION") {
        const snapshot = target.snapshot as unknown as QuotationRevisionSnapshot;
        if (snapshot.entityType !== "QUOTATION") throw new Error("INVALID_SNAPSHOT");

        const dependentSample = await tx.sample.findFirst({
          where: { quotationId: target.entityId },
          select: { id: true },
        });
        if (dependentSample) throw new Error("QUOTATION_HAS_SAMPLE");

        const data = snapshot.quotation;
        await tx.quotationItem.deleteMany({
          where: { quotationId: target.entityId },
        });
        await tx.quotation.update({
          where: { id: target.entityId },
          data: {
            quotationNo: data.quotationNo,
            customerId: data.customerId,
            coaTemplateId: data.coaTemplateId,
            // Restore selalu membuka siklus persetujuan baru.
            status: "REVISION",
            totalAmount: data.totalAmount,
            note: data.note,
            quotationDate: new Date(data.quotationDate),
            validUntil: data.validUntil ? new Date(data.validUntil) : null,
            samplingBy: data.samplingBy as never,
            testingObjective: data.testingObjective as never,
            tatRequested: data.tatRequested as never,
            samplingCost: data.samplingCost,
            vatPercent: data.vatPercent,
            vatAmount: data.vatAmount,
            grandTotal: data.grandTotal,
            paymentTerm: data.paymentTerm,
            termsNote: data.termsNote,
            verifiedById: null,
            approvedById: null,
            items: { create: data.items },
          },
        });

        return captureQuotationRevision(tx, {
          entityId: target.entityId,
          action: "RESTORED",
          session: permission.session!,
          request,
          reason: parsed.data.reason,
          changeSummary: `Restore dari revisi ${target.revisionNo}; approval quotation dibuka ulang`,
          sourceTicketId: parsed.data.sourceTicketId,
          restoredFromRevisionId: target.id,
        });
      }

      const snapshot = target.snapshot as unknown as LabResultRevisionSnapshot;
      if (snapshot.entityType !== "LAB_RESULT") throw new Error("INVALID_SNAPSHOT");

      const current = await tx.sample.findUnique({
        where: { id: target.entityId },
        include: { parameters: true },
      });
      if (!current) throw new Error("ENTITY_NOT_FOUND");
      const currentIds = new Set(current.parameters.map((item) => item.id));

      for (const item of snapshot.sample.parameters) {
        if (!currentIds.has(item.id)) continue;
        await tx.sampleParameter.update({
          where: { id: item.id },
          data: {
            analystId: item.analystId,
            resultValue: item.resultValue,
            resultNote: item.resultNote,
            retestReason: null,
            displayNameSnapshot: item.displayNameSnapshot,
            unitSnapshot: item.unitSnapshot,
            methodSnapshot: item.methodSnapshot,
            standardSnapshot: item.standardSnapshot,
            limitSnapshot: item.limitSnapshot,
            // Hasil lama tidak otomatis divalidasi: wajib review -> verify -> validate.
            status: item.resultValue ? "ENTERED" : "IN_PROGRESS",
            reviewedById: null,
            verifiedById: null,
            validatedById: null,
          },
        });
      }

      await tx.sample.update({
        where: { id: target.entityId },
        data: { status: "IN_ANALYSIS" },
      });
      await tx.workflowLog.create({
        data: {
          actorId: permission.session?.userId,
          sampleId: target.entityId,
          action: "RESTORE_LAB_RESULT_REVISION",
          note: `Restored revision ${target.revisionNo}. Reason: ${parsed.data.reason}`,
        },
      });

      return captureLabResultRevision(tx, {
        entityId: target.entityId,
        action: "RESTORED",
        session: permission.session!,
        request,
        reason: parsed.data.reason,
        changeSummary: `Restore dari revisi ${target.revisionNo}; review laboratorium wajib diulang`,
        sourceTicketId: parsed.data.sourceTicketId,
        restoredFromRevisionId: target.id,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      message: `Revisi ${restoredRevision.revisionNo} dibuat dari snapshot pilihan. Data lama tetap utuh.`,
      revision: restoredRevision,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const responses: Record<string, [string, number]> = {
      REVISION_NOT_FOUND: ["Revisi tidak ditemukan", 404],
      ENTITY_NOT_FOUND: ["Entitas asal tidak ditemukan", 404],
      INTEGRITY_FAILED: ["Checksum snapshot tidak valid. Restore diblokir.", 409],
      INVALID_SNAPSHOT: ["Format snapshot tidak valid", 409],
      QUOTATION_HAS_SAMPLE: [
        "Quotation sudah memiliki sample. Ubah melalui revisi hasil laboratorium agar jejak downstream tidak rusak.",
        409,
      ],
    };
    const [message, status] = responses[code] ?? ["Restore gagal diproses", 500];
    return NextResponse.json({ message }, { status });
  }
}
