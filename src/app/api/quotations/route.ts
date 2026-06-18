import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

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
  description: nullableString,
  customerSampleId: nullableString,
  samplingLocation: nullableString,
  regulationMatrix: nullableString,
  durationSampling: nullableString,
  method: nullableString,
});

const quotationCreateSchema = z.object({
  customerId: z.string().optional().nullable(),
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
  }>;
  priceMap: Map<string, number>;
  samplingCost?: number;
  vatPercent?: number;
}) {
  const totalAmount = input.items.reduce((total, item) => {
    const price = input.priceMap.get(item.parameterId) || 0;
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

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where =
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId
      ? {
          customerId: permission.session.customerId,
          ...(status ? { status: status as any } : {}),
        }
      : status
        ? {
            status: status as any,
          }
        : undefined;

  const quotations = await prisma.quotation.findMany({
    where,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ quotations });
}

export async function POST(request: Request) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canCreate" },
  ]);

  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = quotationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Data tidak valid",
      },
      { status: 400 }
    );
  }

  const customerId =
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT"
      ? permission.session.customerId
      : parsed.data.customerId;

  if (!customerId) {
    return NextResponse.json(
      { message: "Customer wajib dipilih" },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      isActive: true,
    },
  });

  if (!customer) {
    return NextResponse.json(
      { message: "Customer tidak ditemukan / tidak aktif" },
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

  const quotation = await prisma.quotation.create({
    data: {
      quotationNo: generateDocumentNo("QT"),
      customerId,
      coaTemplateId: parsed.data.coaTemplateId,
      note: parsed.data.note || null,

      quotationDate: toDate(parsed.data.quotationDate) || new Date(),
      validUntil: toDate(parsed.data.validUntil),

      samplingBy: parsed.data.samplingBy || "MEDIALAB",
      testingObjective: parsed.data.testingObjective || "ROUTINE_MONITORING",
      tatRequested: parsed.data.tatRequested || "NORMAL",

      totalAmount: totals.totalAmount,
      samplingCost: totals.samplingCost,
      vatPercent: totals.vatPercent,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,

      paymentTerm: parsed.data.paymentTerm || null,
      termsNote: parsed.data.termsNote || null,

      status: "REQUESTED",
      requestedById: permission.session?.userId,
      items: {
        create: parsed.data.items.map((item) => {
          const templateParameter = templateParameterMap.get(item.parameterId);
          const parameter = parameters.find((param) => param.id === item.parameterId);

          return {
            parameterId: item.parameterId,
            qty: item.qty,
            price: priceMap.get(item.parameterId) || 0,
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

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "CREATE_QUOTATION",
      note: `Quotation ${quotation.quotationNo} created with template ${coaTemplate.code}`,
    },
  });

  return NextResponse.json({
    message: "Quotation berhasil dibuat",
    quotation,
  });
}