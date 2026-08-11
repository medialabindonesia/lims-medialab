import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, QuotationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { captureQuotationRevision } from "@/lib/revision-audit";
import { createWithOrderCode, quotationDocumentCode } from "@/lib/order-code";
import {
  calculateQuotationTotals,
  persistQuotationContent,
  quotationChargeItemSchema,
  quotationGroupSchema,
  resolveQuotationContent,
} from "@/lib/quotation-content";

/** DB di VPS diakses lewat internet; satu quotation bisa berisi banyak grup. */
const TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const QUOTATION_INCLUDE = {
  customer: true,
  coaTemplate: true,
  items: {
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: { parameter: true },
  },
  groups: {
    include: {
      matrix: true,
      regulation: true,
      regulationLinks: {
        include: { regulation: true },
        orderBy: { sort: "asc" },
      },
      locations: { orderBy: { sort: "asc" } },
      items: {
        orderBy: [{ sort: "asc" }, { id: "asc" }],
        include: { parameter: true, duration: true },
      },
    },
    orderBy: { sort: "asc" },
  },
  chargeItems: { orderBy: [{ category: "asc" }, { sort: "asc" }] },
  purchaseOrder: true,
  ltr: true,
  ltrs: { include: { items: true }, orderBy: { sequence: "asc" } },
  coc: true,
  cocs: { include: { items: true }, orderBy: { sequence: "asc" } },
  stps: true,
} satisfies Prisma.QuotationInclude;

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

const quotationCreateSchema = z.object({
  customerId: z.string().optional().nullable(),

  /**
   * Tidak lagi diisi sales sejak matriks/regulasi dipilih per grup di Step 2.
   * Dipertahankan nullable agar jalur lama (`items`) tetap bisa dipakai selama
   * masa transisi.
   */
  coaTemplateId: nullableString,
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
  discountAmount: z.coerce.number().min(0).optional(),
  discountLabel: nullableString,
  vatPercent: z.coerce.number().min(0).optional(),

  paymentTerm: nullableString,
  termsNote: nullableString,

  /** Struktur baru: satu grup = satu baris pada surat penawaran resmi. */
  groups: z.array(quotationGroupSchema).optional(),
  chargeItems: z.array(quotationChargeItemSchema).default([]),

  /** Jalur lama, dipakai bila `groups` tidak dikirim. */
  items: z.array(quotationItemSchema).optional(),
  /** Lead asal, bila quotation dibuat dari hasil kualifikasi CS. */
  leadId: nullableString,
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
    customPrice?: number;
  }>;
  priceMap: Map<string, number>;
  samplingCost?: number;
  vatPercent?: number;
  tatRequested?: "NORMAL" | "URGENT" | "TOP_URGENT" | null;
}) {
  const totalAmount = input.items.reduce((total, item) => {
    const price = item.customPrice ?? input.priceMap.get(item.parameterId) ?? 0;
    return total + price * item.qty;
  }, 0);

  return calculateQuotationTotals({
    totalAmount,
    samplingCost: input.samplingCost,
    vatPercent: input.vatPercent,
    tatRequested: input.tatRequested,
  });
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
  const validStatus =
    status &&
    Object.values(QuotationStatus).includes(status as QuotationStatus)
      ? (status as QuotationStatus)
      : undefined;

  const where =
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId
      ? {
          customerId: permission.session.customerId,
          ...(validStatus ? { status: validStatus } : {}),
        }
      : validStatus
        ? {
            status: validStatus,
          }
        : undefined;

  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      // Wajib memakai QUOTATION_INCLUDE agar `groups` ikut terkirim. Endpoint
      // ini yang memuat ulang daftar di browser; kalau isinya berbeda dari
      // render awal server, label "Jenis uji" berubah jadi "-" begitu daftar
      // di-refresh.
      ...QUOTATION_INCLUDE,
      ltrs: { include: { items: true }, orderBy: { sequence: "asc" } },
      cocs: {
        include: { items: true, ltr: true, sample: true },
        orderBy: { sequence: "asc" },
      },
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

  const quotationIds = quotations.map((quotation) => quotation.id);
  const [revisions, creators] = await Promise.all([
    quotationIds.length
      ? prisma.auditRevision.findMany({
          where: { entityType: "QUOTATION", entityId: { in: quotationIds } },
          select: {
            id: true,
            entityId: true,
            revisionNo: true,
            action: true,
            changeSummary: true,
            reason: true,
            actorNameSnapshot: true,
            createdAt: true,
          },
          orderBy: [{ entityId: "asc" }, { revisionNo: "desc" }],
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        id: {
          in: [...new Set(quotations.map((item) => item.requestedById).filter(Boolean))] as string[],
        },
      },
      select: { id: true, name: true, email: true },
    }),
  ]);
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
  return NextResponse.json({
    quotations: quotations.map((quotation) => ({
      ...quotation,
      requestedBy: quotation.requestedById
        ? creatorMap.get(quotation.requestedById) || null
        : null,
      revisions: revisions.filter((revision) => revision.entityId === quotation.id),
    })),
  });
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

  const sourceLead = parsed.data.leadId
    ? await prisma.lead.findFirst({
        where: { id: parsed.data.leadId, customerId },
        select: { id: true, status: true },
      })
    : null;

  if (parsed.data.leadId && !sourceLead) {
    return NextResponse.json(
      { message: "Lead tidak ditemukan atau bukan milik customer tersebut" },
      { status: 400 }
    );
  }

  const baseData = {
    customerId,
    note: parsed.data.note || null,

    quotationDate: toDate(parsed.data.quotationDate) || new Date(),
    validUntil: toDate(parsed.data.validUntil),

    samplingBy: parsed.data.samplingBy || "MEDIALAB",
    testingObjective: parsed.data.testingObjective || "ROUTINE_MONITORING",
    tatRequested: parsed.data.tatRequested || "NORMAL",

    paymentTerm: parsed.data.paymentTerm || null,
    termsNote: parsed.data.termsNote || null,

    status: "REQUESTED" as const,
    requestedById: permission.session?.userId,
  };

  // Pengajuan dari portal customer: seluruh angka harga ditentukan Medialab,
  // bukan diambil dari payload. Lihat ResolveOptions.ignoreSubmittedPrices.
  const isCustomerSubmission =
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT";

  // ---------- Jalur baru: quotation berbasis grup ----------
  if (parsed.data.groups?.length) {
    const resolved = await resolveQuotationContent(prisma, parsed.data.groups, {
      ignoreSubmittedPrices: isCustomerSubmission,
      chargeItems: isCustomerSubmission ? [] : parsed.data.chargeItems,
    });

    if (!resolved.ok) {
      return NextResponse.json({ message: resolved.message }, { status: 400 });
    }

    const totals = calculateQuotationTotals({
      totalAmount: resolved.content.totalAmount,
      samplingCost: resolved.content.samplingCost,
      additionalCost: resolved.content.additionalCost,
      discountAmount: isCustomerSubmission ? 0 : parsed.data.discountAmount,
      vatPercent: isCustomerSubmission ? undefined : parsed.data.vatPercent,
      tatRequested: parsed.data.tatRequested || "NORMAL",
    });

    const quotation = await createWithOrderCode(prisma, (orderCode) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.quotation.create({
          data: {
            ...baseData,
            orderCode,
            quotationNo: quotationDocumentCode(orderCode) ?? orderCode,
            coaTemplateId: parsed.data.coaTemplateId || null,

            pricingStatus: resolved.content.pricingStatus,
            totalAmount: totals.totalAmount,
            tatBusinessDays: totals.tatBusinessDays,
            tatPriceMultiplier: totals.tatPriceMultiplier,
            tatSurchargeAmount: totals.tatSurchargeAmount,
            samplingCost: totals.samplingCost,
            additionalCost: totals.additionalCost,
            discountAmount: totals.discountAmount,
            discountLabel: parsed.data.discountLabel || null,
            vatPercent: totals.vatPercent,
            vatAmount: totals.vatAmount,
            grandTotal: totals.grandTotal,
          },
          select: { id: true, quotationNo: true },
        });

        await persistQuotationContent(tx, created.id, resolved.content);

        if (sourceLead) {
          await tx.lead.update({
            where: { id: sourceLead.id },
            data: { quotationId: created.id, status: "QUOTATION_CREATED" },
          });
        }

        await tx.workflowLog.create({
          data: {
            actorId: permission.session?.userId,
            action: "CREATE_QUOTATION",
            note: `Quotation ${created.quotationNo} dibuat dengan ${resolved.content.groups.length} grup`,
          },
        });

        await captureQuotationRevision(tx, {
          entityId: created.id,
          action: "CREATED",
          session: permission.session!,
          request,
          changeSummary: "Quotation pertama dibuat",
        });

        return tx.quotation.findUniqueOrThrow({
          where: { id: created.id },
          include: QUOTATION_INCLUDE,
        });
      }, TRANSACTION_OPTIONS)
    );

    return NextResponse.json({
      message:
        resolved.content.unpricedCount > 0
          ? `Quotation ${quotation.quotationNo} disimpan. ${resolved.content.unpricedCount} paket/biaya belum berharga dan harus dilengkapi sebelum approval.`
          : `Quotation ${quotation.quotationNo} berhasil dibuat`,
      quotation,
    });
  }

  // ---------- Jalur lama: daftar parameter datar ----------
  if (!parsed.data.items?.length) {
    return NextResponse.json(
      { message: "Minimal buat 1 grup parameter" },
      { status: 400 }
    );
  }

  const legacyItems = parsed.data.items;

  const coaTemplate = parsed.data.coaTemplateId
    ? await prisma.coaTemplate.findFirst({
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
      })
    : null;

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
    ...new Set(legacyItems.map((item) => item.parameterId)),
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
    items: legacyItems,
    priceMap,
    samplingCost: parsed.data.samplingCost,
    vatPercent: parsed.data.vatPercent,
    tatRequested: parsed.data.tatRequested || "NORMAL",
  });

  const quotation = await createWithOrderCode(prisma, (orderCode) =>
    prisma.quotation.create({
    data: {
      ...baseData,
      orderCode,
      quotationNo: quotationDocumentCode(orderCode) ?? orderCode,
      coaTemplateId: parsed.data.coaTemplateId,

      // Jalur lama selalu menulis harga berupa angka, sehingga tidak pernah
      // menghasilkan status selain PRICED.
      pricingStatus: "PRICED",
      totalAmount: totals.totalAmount,
      tatBusinessDays: totals.tatBusinessDays,
      tatPriceMultiplier: totals.tatPriceMultiplier,
      tatSurchargeAmount: totals.tatSurchargeAmount,
      samplingCost: totals.samplingCost,
      vatPercent: totals.vatPercent,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,

      items: {
        create: legacyItems.map((item, index) => {
          const templateParameter = templateParameterMap.get(item.parameterId);
          const parameter = parameters.find((param) => param.id === item.parameterId);

          return {
            parameterId: item.parameterId,
            sort: (index + 1) * 10,
            qty: item.qty,
            price: item.customPrice ?? priceMap.get(item.parameterId) ?? 0,
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
      include: QUOTATION_INCLUDE,
    })
  );

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "CREATE_QUOTATION",
      note: `Quotation ${quotation.quotationNo} created with template ${coaTemplate.code}`,
    },
  });
  if (sourceLead) {
    await prisma.lead.update({
      where: { id: sourceLead.id },
      data: { quotationId: quotation.id, status: "QUOTATION_CREATED" },
    });
  }
  await prisma.$transaction((tx) =>
    captureQuotationRevision(tx, {
      entityId: quotation.id,
      action: "CREATED",
      session: permission.session!,
      request,
      changeSummary: "Quotation pertama dibuat",
    })
  );

  return NextResponse.json({
    message: "Quotation berhasil dibuat",
    quotation,
  });
}
