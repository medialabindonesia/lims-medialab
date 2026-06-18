import { NextResponse } from "next/server";
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

  items: z.array(cocItemSchema).optional().default([]),
});

type RouteContext = {
  params: Promise<{
    quotationId: string;
  }>;
};

function toDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

async function ensureSampleAndParametersTx(input: {
  tx: any;
  quotationId: string;
  actorId?: string;
}) {
  const { tx, quotationId, actorId } = input;

  const quotation = await tx.quotation.findUnique({
    where: {
      id: quotationId,
    },
    include: {
      customer: true,
      coaTemplate: {
        include: {
          parameters: true,
        },
      },
      items: {
        include: {
          parameter: true,
        },
      },
      samples: {
        include: {
          parameters: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!quotation) {
    throw new Error("Quotation tidak ditemukan");
  }

  const existingSample = quotation.samples[0];

  if (existingSample) {
    const existingParameterIds = new Set(
      existingSample.parameters.map((item: any) => item.parameterId)
    );

    const missingItems = quotation.items.filter(
      (item: any) => !existingParameterIds.has(item.parameterId)
    );

    if (missingItems.length > 0) {
      await tx.sampleParameter.createMany({
        data: missingItems.map((item: any) => {
          const templateParameter = quotation.coaTemplate?.parameters.find(
            (templateItem: any) => templateItem.parameterId === item.parameterId
          );

          return {
            sampleId: existingSample.id,
            parameterId: item.parameterId,
            templateParameterId: templateParameter?.id || null,
            status: "WAITING",
          };
        }),
      });
    }

    return existingSample;
  }

  const sample = await tx.sample.create({
    data: {
      sampleNo: generateDocumentNo("SMP"),
      quotationId: quotation.id,
      customerId: quotation.customerId,
      coaTemplateId: quotation.coaTemplateId,
      status: "WAITING_SAMPLE",
      parameters: {
        create: quotation.items.map((item: any) => {
          const templateParameter = quotation.coaTemplate?.parameters.find(
            (templateItem: any) => templateItem.parameterId === item.parameterId
          );

          return {
            parameterId: item.parameterId,
            templateParameterId: templateParameter?.id || null,
            status: "WAITING",
          };
        }),
      },
    },
  });

  await tx.workflowLog.create({
    data: {
      actorId,
      sampleId: sample.id,
      action: "CREATE_SAMPLE_FROM_COC",
      note: `Sample ${sample.sampleNo} created from quotation ${quotation.quotationNo}`,
    },
  });

  return sample;
}

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("technical.coc", "canCreate");
  if (!permission.allowed) return permission.response;

  try {
    const { quotationId } = await context.params;
    const body = await request.json();
    const parsed = cocSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const quotation = await prisma.quotation.findUnique({
      where: {
        id: quotationId,
      },
      include: {
        customer: true,
        ltr: true,
        coc: true,
        items: true,
        coaTemplate: true,
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { message: "Quotation tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!quotation.ltr) {
      return NextResponse.json(
        { message: "COC hanya bisa dibuat setelah LTR dibuat" },
        { status: 400 }
      );
    }

    if (!["LTR_CREATED", "COC_CREATED"].includes(quotation.status)) {
      return NextResponse.json(
        { message: "Status quotation belum siap dibuat COC" },
        { status: 400 }
      );
    }

    if (quotation.items.length === 0) {
      return NextResponse.json(
        { message: "Quotation belum memiliki parameter" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const sample = await ensureSampleAndParametersTx({
          tx,
          quotationId: quotation.id,
          actorId: permission.session?.userId,
        });

        if (parsed.data.items.length > 0) {
          await Promise.all(
            parsed.data.items.map((item) =>
              tx.quotationItem.updateMany({
                where: {
                  id: item.id,
                  quotationId: quotation.id,
                },
                data: {
                  customerSampleId: item.customerSampleId || null,
                  samplingLocation: item.samplingLocation || null,
                  regulationMatrix: item.regulationMatrix || null,
                  durationSampling: item.durationSampling || null,
                  method: item.method || null,
                },
              })
            )
          );
        }

        const coc = quotation.coc
          ? await tx.coc.update({
              where: {
                id: quotation.coc.id,
              },
              data: {
                sampleId: sample.id,
                createdById: permission.session?.userId,
                customerEmailCoa: parsed.data.customerEmailCoa || null,
                customerCode: parsed.data.customerCode || null,
                samplerName: parsed.data.samplerName || null,
                samplingLocation: parsed.data.samplingLocation || null,
                tatRequested:
                  parsed.data.tatRequested ||
                  quotation.tatRequested ||
                  "NORMAL",
                plannedSamplingStart: toDate(
                  parsed.data.plannedSamplingStart
                ),
                plannedSamplingEnd: toDate(parsed.data.plannedSamplingEnd),
                estimatedCoaDate: toDate(parsed.data.estimatedCoaDate),
                sampleConditionSamplingInfo:
                  parsed.data.sampleConditionSamplingInfo || null,
                sampleConditionMethod:
                  parsed.data.sampleConditionMethod || null,
                sampleConditionReceived:
                  parsed.data.sampleConditionReceived || null,
                abnormalCondition: parsed.data.abnormalCondition || null,
                specialInstruction: parsed.data.specialInstruction || null,
                deliveryMethod:
                  parsed.data.deliveryMethod || "MEDIALAB_SAMPLING",
              },
            })
          : await tx.coc.create({
              data: {
                cocNo: generateDocumentNo("COC"),
                quotationId: quotation.id,
                sampleId: sample.id,
                createdById: permission.session?.userId,
                customerEmailCoa: parsed.data.customerEmailCoa || null,
                customerCode: parsed.data.customerCode || null,
                samplerName: parsed.data.samplerName || null,
                samplingLocation: parsed.data.samplingLocation || null,
                tatRequested:
                  parsed.data.tatRequested ||
                  quotation.tatRequested ||
                  "NORMAL",
                plannedSamplingStart: toDate(
                  parsed.data.plannedSamplingStart
                ),
                plannedSamplingEnd: toDate(parsed.data.plannedSamplingEnd),
                estimatedCoaDate: toDate(parsed.data.estimatedCoaDate),
                sampleConditionSamplingInfo:
                  parsed.data.sampleConditionSamplingInfo || null,
                sampleConditionMethod:
                  parsed.data.sampleConditionMethod || null,
                sampleConditionReceived:
                  parsed.data.sampleConditionReceived || null,
                abnormalCondition: parsed.data.abnormalCondition || null,
                specialInstruction: parsed.data.specialInstruction || null,
                deliveryMethod:
                  parsed.data.deliveryMethod || "MEDIALAB_SAMPLING",
              },
            });

        await tx.quotation.update({
          where: {
            id: quotation.id,
          },
          data: {
            status: "COC_CREATED",
          },
        });

        await tx.workflowLog.create({
          data: {
            actorId: permission.session?.userId,
            sampleId: sample.id,
            action: quotation.coc ? "UPDATE_COC" : "CREATE_COC",
            note: `COC ${coc.cocNo} saved for quotation ${quotation.quotationNo}`,
          },
        });

        return { coc, sample };
      },
      {
        timeout: 20000,
        maxWait: 20000,
      }
    );

    return NextResponse.json({
      message: quotation.coc
        ? "COC berhasil diupdate"
        : "COC berhasil dibuat dan sample otomatis disiapkan",
      ...result,
    });
  } catch (error) {
    console.error("CREATE_COC_ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan COC",
      },
      { status: 500 }
    );
  }
}