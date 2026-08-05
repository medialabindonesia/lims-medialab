import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

const nullableString = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().optional().nullable()
);
const nullableDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().optional().nullable()
);
const cocItemSchema = z.object({
  id: z.string().min(1),
  customerSampleId: nullableString,
  samplingLocation: nullableString,
  regulationMatrix: nullableString,
  durationSampling: nullableString,
  method: nullableString,
});
const cocSchema = z.object({
  cocId: z.string().optional().nullable(),
  ltrId: z.string().optional().nullable(),
  groupLabel: z.string().trim().min(3, "Nama kelompok minimal 3 karakter").max(120),
  customerEmailCoa: nullableString,
  customerCode: nullableString,
  samplerName: nullableString,
  samplingLocation: nullableString,
  tatRequested: z.enum(["NORMAL", "URGENT", "TOP_URGENT"]).optional().nullable(),
  plannedSamplingStart: nullableDate,
  plannedSamplingEnd: nullableDate,
  estimatedCoaDate: nullableDate,
  sampleConditionSamplingInfo: nullableString,
  sampleConditionMethod: nullableString,
  sampleConditionReceived: nullableString,
  abnormalCondition: nullableString,
  specialInstruction: nullableString,
  deliveryMethod: z
    .enum(["MEDIALAB_SAMPLING", "CUSTOMER_DELIVERY", "COURIER", "OTHER"])
    .optional()
    .nullable(),
  items: z.array(cocItemSchema).min(1, "Pilih minimal satu titik uji untuk COC"),
});

type RouteContext = { params: Promise<{ quotationId: string }> };
type QuotationForCoc = Prisma.QuotationGetPayload<{
  include: {
    coaTemplate: { include: { parameters: true } };
    items: { include: { parameter: true } };
  };
}>;

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sampleParameterData(quotation: QuotationForCoc, itemIds: Set<string>) {
  return quotation.items
    .filter((item) => itemIds.has(item.id))
    .map((item) => {
      const templateParameter = quotation.coaTemplate?.parameters.find(
        (candidate) => candidate.parameterId === item.parameterId
      );
      return {
        parameterId: item.parameterId,
        templateParameterId: templateParameter?.id || null,
        status: "WAITING" as const,
        displayNameSnapshot:
          item.description || templateParameter?.displayName || item.parameter.name,
        unitSnapshot: templateParameter?.unit || item.parameter.unit,
        methodSnapshot:
          item.method || templateParameter?.method || item.parameter.method,
        standardSnapshot:
          item.regulationMatrix || templateParameter?.standard || null,
        limitSnapshot: templateParameter?.limitValue || null,
      };
    });
}

async function ensureSampleForCoc(
  tx: Prisma.TransactionClient,
  quotation: QuotationForCoc,
  itemIds: Set<string>,
  existingSampleId: string | null,
  actorId?: string
) {
  const parameters = sampleParameterData(quotation, itemIds);
  if (existingSampleId) {
    const existing = await tx.sample.findUnique({
      where: { id: existingSampleId },
      include: { parameters: true },
    });
    if (!existing) throw new Error("Sample COC tidak ditemukan");

    const nextKeys = parameters.map((item) => item.parameterId).sort().join("|");
    const currentKeys = existing.parameters.map((item) => item.parameterId).sort().join("|");
    if (nextKeys !== currentKeys) {
      if (existing.parameters.some((item) => item.status !== "WAITING")) {
        throw new Error(
          "Titik uji tidak dapat diubah karena analisis sample sudah dimulai"
        );
      }
      await tx.sampleParameter.deleteMany({ where: { sampleId: existing.id } });
      await tx.sampleParameter.createMany({
        data: parameters.map((item) => ({ ...item, sampleId: existing.id })),
      });
    }
    return existing;
  }

  const sample = await tx.sample.create({
    data: {
      sampleNo: generateDocumentNo("SMP"),
      quotationId: quotation.id,
      customerId: quotation.customerId,
      coaTemplateId: quotation.coaTemplateId,
      status: "WAITING_SAMPLE",
      parameters: { create: parameters },
    },
  });
  await tx.workflowLog.create({
    data: {
      actorId,
      sampleId: sample.id,
      action: "CREATE_SAMPLE_FROM_COC",
      note: `Sample ${sample.sampleNo} dibuat untuk kelompok COC quotation ${quotation.quotationNo}`,
    },
  });
  return sample;
}

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("technical.coc", "canCreate");
  if (!permission.allowed) return permission.response;

  try {
    const { quotationId } = await context.params;
    const parsed = cocSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        coaTemplate: { include: { parameters: true } },
        items: { include: { parameter: true } },
        ltrs: true,
        cocs: {
          include: { items: true, sample: { include: { parameters: true } } },
          orderBy: { sequence: "asc" },
        },
      },
    });
    if (!quotation) {
      return NextResponse.json({ message: "Quotation tidak ditemukan" }, { status: 404 });
    }
    if (!["APPROVED", "PO_UPLOADED", "LTR_CREATED", "COC_CREATED"].includes(quotation.status)) {
      return NextResponse.json(
        { message: "COC dapat dibuat langsung setelah quotation disetujui" },
        { status: 400 }
      );
    }

    const targetCoc = parsed.data.cocId
      ? quotation.cocs.find((item) => item.id === parsed.data.cocId)
      : null;
    if (parsed.data.cocId && !targetCoc) {
      return NextResponse.json({ message: "COC tidak ditemukan" }, { status: 404 });
    }
    if (
      parsed.data.ltrId &&
      !quotation.ltrs.some((item) => item.id === parsed.data.ltrId)
    ) {
      return NextResponse.json({ message: "LTR bukan milik quotation ini" }, { status: 400 });
    }

    const itemIds = new Set(parsed.data.items.map((item) => item.id));
    const validItemIds = new Set(quotation.items.map((item) => item.id));
    if ([...itemIds].some((id) => !validItemIds.has(id))) {
      return NextResponse.json({ message: "Ada titik uji yang tidak valid" }, { status: 400 });
    }
    const assignedElsewhere = new Set(
      quotation.cocs
        .filter((item) => item.id !== targetCoc?.id)
        .flatMap((item) => item.items.map((link) => link.quotationItemId))
    );
    if ([...itemIds].some((id) => assignedElsewhere.has(id))) {
      return NextResponse.json(
        { message: "Satu atau lebih titik uji sudah masuk ke COC lain" },
        { status: 409 }
      );
    }

    const sequence = targetCoc?.sequence ??
      Math.max(0, ...quotation.cocs.map((item) => item.sequence)) + 1;
    const result = await prisma.$transaction(async (tx) => {
      for (const item of parsed.data.items) {
        await tx.quotationItem.update({
          where: { id: item.id },
          data: {
            customerSampleId: item.customerSampleId || null,
            samplingLocation: item.samplingLocation || null,
            regulationMatrix: item.regulationMatrix || null,
            durationSampling: item.durationSampling || null,
            method: item.method || null,
          },
        });
      }

      const sample = await ensureSampleForCoc(
        tx,
        quotation,
        itemIds,
        targetCoc?.sampleId || null,
        permission.session?.userId
      );
      const documentData = {
        ltrId: parsed.data.ltrId || null,
        sampleId: sample.id,
        groupLabel: parsed.data.groupLabel,
        createdById: permission.session?.userId,
        customerEmailCoa: parsed.data.customerEmailCoa || null,
        customerCode: parsed.data.customerCode || null,
        samplerName: parsed.data.samplerName || null,
        samplingLocation: parsed.data.samplingLocation || null,
        tatRequested: parsed.data.tatRequested || quotation.tatRequested || "NORMAL",
        plannedSamplingStart: toDate(parsed.data.plannedSamplingStart),
        plannedSamplingEnd: toDate(parsed.data.plannedSamplingEnd),
        estimatedCoaDate: toDate(parsed.data.estimatedCoaDate),
        sampleConditionSamplingInfo: parsed.data.sampleConditionSamplingInfo || null,
        sampleConditionMethod: parsed.data.sampleConditionMethod || null,
        sampleConditionReceived: parsed.data.sampleConditionReceived || null,
        abnormalCondition: parsed.data.abnormalCondition || null,
        specialInstruction: parsed.data.specialInstruction || null,
        deliveryMethod: parsed.data.deliveryMethod || "MEDIALAB_SAMPLING",
      } as const;

      const coc = targetCoc
        ? await tx.coc.update({
            where: { id: targetCoc.id },
            data: {
              ...documentData,
              items: {
                deleteMany: {},
                create: [...itemIds].map((quotationItemId, sort) => ({
                  quotationItemId,
                  sort,
                })),
              },
            },
            include: { items: true, sample: true, ltr: true },
          })
        : await tx.coc.create({
            data: {
              ...documentData,
              quotationId: quotation.id,
              sequence,
              cocNo: generateDocumentNo(`COC-${String(sequence).padStart(2, "0")}`),
              items: {
                create: [...itemIds].map((quotationItemId, sort) => ({
                  quotationItemId,
                  sort,
                })),
              },
            },
            include: { items: true, sample: true, ltr: true },
          });

      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: "COC_CREATED",
          ...(quotation.primaryCocId ? {} : { primaryCocId: coc.id }),
        },
      });
      await tx.workflowLog.create({
        data: {
          actorId: permission.session?.userId,
          sampleId: sample.id,
          action: targetCoc ? "UPDATE_COC" : "CREATE_COC",
          note: `${targetCoc ? "COC diperbarui" : "COC dibuat"}: ${coc.cocNo}, kelompok ${coc.groupLabel}, ${itemIds.size} titik uji${coc.ltrId ? " dengan LTR" : " tanpa LTR"}`,
        },
      });
      return { coc, sample };
    }, { timeout: 20000, maxWait: 20000 });

    return NextResponse.json({
      message: targetCoc
        ? "COC berhasil diperbarui"
        : `COC bagian ${sequence} berhasil dibuat tanpa informasi harga`,
      ...result,
    });
  } catch (error) {
    console.error("CREATE_COC_ERROR:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menyimpan COC" },
      { status: 500 }
    );
  }
}
