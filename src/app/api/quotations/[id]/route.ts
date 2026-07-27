import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateRevisionQuotationNo } from "@/lib/document-number";
import { captureQuotationRevision } from "@/lib/revision-audit";

const nullableString = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().optional().nullable()
);

const nullableDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().optional().nullable()
);

const quotationItemSchema = z.object({
  parameterId: z.string().min(1, "Parameter wajib dipilih"),
  qty: z.coerce.number().int().min(1, "Qty minimal 1"),
  customPrice: z.coerce.number().min(0).optional(),
  description: nullableString,
  customerSampleId: nullableString,
  samplingLocation: nullableString,
  regulationMatrix: nullableString,
  durationSampling: nullableString,
  method: nullableString,
});

const quotationUpdateSchema = z.object({
  customerId: z.string().min(1, "Customer wajib dipilih"),
  coaTemplateId: z.string().min(1, "Template COA wajib dipilih"),
  note: nullableString,

  quotationDate: nullableDate,
  validUntil: nullableDate,

  samplingBy: z
    .enum(["MEDIALAB", "CUSTOMER", "THIRD_PARTY"])
    .optional()
    .nullable(),
  testingObjective: z
    .enum(["ROUTINE_MONITORING", "SUPERVISION", "CASE_PROOF", "RESEARCH", "OTHER"])
    .optional()
    .nullable(),
  tatRequested: z.enum(["NORMAL", "URGENT", "TOP_URGENT"]).optional().nullable(),

  samplingCost: z.coerce.number().min(0).optional(),
  vatPercent: z.coerce.number().min(0).optional(),

  paymentTerm: nullableString,
  termsNote: nullableString,

  items: z.array(quotationItemSchema).min(1, "Minimal pilih 1 parameter"),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function calculateTotals(input: {
  items: Array<{
    parameterId: string;
    qty: number;
    customPrice?: number;
  }>;
  priceMap: Map<string, number>;
  samplingCost?: number;
  vatPercent?: number;
}) {
  const totalAmount = input.items.reduce((total, item) => {
    const price = item.customPrice ?? input.priceMap.get(item.parameterId) ?? 0;
    return total + price * item.qty;
  }, 0);

  const samplingCost = input.samplingCost || 0;
  const vatPercent = input.vatPercent ?? 11;
  const taxableAmount = totalAmount + samplingCost;
  const vatAmount = taxableAmount * (vatPercent / 100);
  const grandTotal = taxableAmount + vatAmount;

  return {
    totalAmount,
    samplingCost,
    vatPercent,
    vatAmount,
    grandTotal,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canView" },
    { menuKey: "quotation.verify", action: "canView" },
    { menuKey: "quotation.revise", action: "canView" },
    { menuKey: "quotation.approve", action: "canView" },
    { menuKey: "sales.ltr", action: "canView" },
    { menuKey: "technical.coc", action: "canView" },
    { menuKey: "technical.stps", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      coaTemplate: true,
      items: {
        include: {
          parameter: true,
        },
      },
      purchaseOrder: true,
      ltr: true,
      coc: true,
      stps: true,
      invoice: true,
      samples: {
        include: {
          coa: true,
        },
      },
    },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    quotation.customerId !== permission.session.customerId
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ quotation });
}

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.revise", action: "canUpdate" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = quotationUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Data tidak valid",
      },
      { status: 400 }
    );
  }

  const existingQuotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      purchaseOrder: true,
      ltr: true,
      coc: true,
    },
  });

  if (!existingQuotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (existingQuotation.status !== "REVISION") {
    return NextResponse.json(
      {
        message:
          "Staff hanya bisa merevisi quotation yang statusnya REVISION dari customer",
      },
      { status: 400 }
    );
  }

  const coaTemplate = await prisma.coaTemplate.findFirst({
    where: {
      id: parsed.data.coaTemplateId,
      isActive: true,
    },
    include: {
      parameters: {
        include: {
          parameter: true,
        },
      },
    },
  });

  if (!coaTemplate) {
    return NextResponse.json(
      { message: "Template COA tidak ditemukan / tidak aktif" },
      { status: 400 }
    );
  }

  const allowedParameterIds = new Set(
    coaTemplate.parameters
      .filter((item) => item.isActive)
      .map((item) => item.parameterId)
  );

  const parameterIds = [
    ...new Set(parsed.data.items.map((item) => item.parameterId)),
  ];

  const invalidByTemplate = parameterIds.some(
    (parameterId) => !allowedParameterIds.has(parameterId)
  );

  if (invalidByTemplate) {
    return NextResponse.json(
      { message: "Ada parameter yang tidak termasuk dalam template COA" },
      { status: 400 }
    );
  }

  const parameters = await prisma.analysisParameter.findMany({
    where: {
      id: {
        in: parameterIds,
      },
      isActive: true,
    },
  });

  if (parameters.length !== parameterIds.length) {
    return NextResponse.json(
      { message: "Ada parameter yang tidak ditemukan / tidak aktif" },
      { status: 400 }
    );
  }

  const priceMap = new Map(
    parameters.map((parameter) => [parameter.id, parameter.price])
  );

  const templateParameterMap = new Map(
    coaTemplate.parameters.map((item) => [item.parameterId, item])
  );

  const totals = calculateTotals({
    items: parsed.data.items,
    priceMap,
    samplingCost: parsed.data.samplingCost,
    vatPercent: parsed.data.vatPercent,
  });

  const nextQuotationNo = generateRevisionQuotationNo(
    existingQuotation.quotationNo
  );

  const quotation = await prisma.$transaction(async (tx) => {
    await captureQuotationRevision(tx, {
      entityId: id,
      action: "CREATED",
      session: permission.session!,
      request,
      changeSummary: "Baseline sebelum staff merevisi quotation",
    });

    await tx.quotationItem.deleteMany({
      where: {
        quotationId: id,
      },
    });

    const updated = await tx.quotation.update({
      where: { id },
      data: {
        quotationNo: nextQuotationNo,
        customerId: parsed.data.customerId,
        coaTemplateId: parsed.data.coaTemplateId,
        note: parsed.data.note || existingQuotation.note,

        quotationDate:
          toDate(parsed.data.quotationDate) ||
          existingQuotation.quotationDate ||
          new Date(),
        validUntil: toDate(parsed.data.validUntil),

        samplingBy: parsed.data.samplingBy || existingQuotation.samplingBy,
        testingObjective:
          parsed.data.testingObjective || existingQuotation.testingObjective,
        tatRequested: parsed.data.tatRequested || existingQuotation.tatRequested,

        totalAmount: totals.totalAmount,
        samplingCost: totals.samplingCost,
        vatPercent: totals.vatPercent,
        vatAmount: totals.vatAmount,
        grandTotal: totals.grandTotal,

        paymentTerm: parsed.data.paymentTerm || null,
        termsNote: parsed.data.termsNote || null,

        status: "NEGOTIATION",
        verifiedById: null,
        approvedById: null,
        items: {
          create: parsed.data.items.map((item) => {
            const templateParameter = templateParameterMap.get(item.parameterId);
            const parameter = parameters.find(
              (param) => param.id === item.parameterId
            );

            const price =
              item.customPrice ?? priceMap.get(item.parameterId) ?? 0;

            return {
              parameterId: item.parameterId,
              qty: item.qty,
              price,
              description: item.description || null,
              customerSampleId: item.customerSampleId || null,
              samplingLocation: item.samplingLocation || null,
              regulationMatrix:
                item.regulationMatrix ||
                templateParameter?.standard ||
                null,
              durationSampling: item.durationSampling || null,
              method:
                item.method ||
                templateParameter?.method ||
                parameter?.method ||
                null,
            };
          }),
        },
      },
      include: {
        customer: true,
        coaTemplate: true,
        items: {
          include: {
            parameter: true,
          },
        },
        purchaseOrder: true,
        ltr: true,
        coc: true,
        stps: true,
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        action: "STAFF_REVISE_QUOTATION",
        note: `Quotation revised from ${existingQuotation.quotationNo} to ${nextQuotationNo}`,
      },
    });

    await captureQuotationRevision(tx, {
      entityId: id,
      action: "UPDATED",
      session: permission.session!,
      request,
      reason: parsed.data.note || null,
      changeSummary: `Quotation direvisi menjadi ${nextQuotationNo}`,
    });

    return updated;
  });

  return NextResponse.json({
    message: `Quotation berhasil direvisi dan dikirim ke customer sebagai ${nextQuotationNo}`,
    quotation,
  });
}
