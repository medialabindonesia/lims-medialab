import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateRevisionQuotationNo } from "@/lib/document-number";
import { captureQuotationRevision } from "@/lib/revision-audit";
import { nextQuotationRevisionCode } from "@/lib/order-code";
import {
  calculateQuotationTotals,
  persistQuotationContent,
  quotationGroupSchema,
  resolveQuotationContent,
} from "@/lib/quotation-content";

/** DB di VPS diakses lewat internet; satu quotation bisa berisi banyak grup. */
const TRANSACTION_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

const QUOTATION_INCLUDE = {
  customer: true,
  coaTemplate: true,
  items: { include: { parameter: true } },
  groups: {
    include: {
      matrix: true,
      regulation: true,
      locations: { orderBy: { sort: "asc" } },
      items: { include: { parameter: true, duration: true } },
    },
    orderBy: { sort: "asc" },
  },
  purchaseOrder: true,
  ltr: true,
  coc: true,
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

const quotationUpdateSchema = z.object({
  /**
   * Wajib hanya saat mengubah dokumen yang sudah beredar. Menyunting draft
   * sendiri (status REQUESTED) tidak perlu alasan — divalidasi di handler
   * setelah status quotation diketahui.
   */
  editReason: z.string().trim().max(1000).optional(),
  customerId: z.string().min(1, "Customer wajib dipilih"),

  /** Tidak lagi diisi sales; dipertahankan untuk jalur lama. */
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
  vatPercent: z.coerce.number().min(0).optional(),

  paymentTerm: nullableString,
  termsNote: nullableString,

  /** Struktur baru: satu grup = satu baris pada surat penawaran resmi. */
  groups: z.array(quotationGroupSchema).optional(),

  /** Jalur lama, dipakai bila `groups` tidak dikirim. */
  items: z.array(quotationItemSchema).optional(),
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
      ltrs: { include: { items: true }, orderBy: { sequence: "asc" } },
      coc: true,
      cocs: { include: { items: true }, orderBy: { sequence: "asc" } },
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
      ltrs: true,
      coc: true,
      cocs: true,
    },
  });

  if (!existingQuotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  /*
   * REQUESTED ikut dibuka karena quotation yang baru dibuat masih berupa
   * draft sales: scope dan harga memang disusun bertahap sebelum dikirim ke
   * customer. Sebelumnya sales sama sekali tidak bisa menyunting hasil
   * buatannya sendiri, sehingga skenario "harga menyusul" tidak punya jalan
   * selain menunggu quotation ditolak lebih dulu.
   *
   * CONFIRMED dan VERIFIED sengaja TIDAK dibuka: pada titik itu customer
   * sudah menyetujui scope tertentu, dan mengubahnya diam-diam berarti
   * dokumen yang disetujui berbeda dari yang dikerjakan.
   */
  const editableStatuses = [
    "REQUESTED",
    "REVISION",
    "NEGOTIATION",
    "REJECTED",
    "APPROVED",
    "PO_UPLOADED",
  ];

  if (!editableStatuses.includes(existingQuotation.status)) {
    return NextResponse.json(
      {
        message: `Quotation berstatus ${existingQuotation.status} tidak dapat diubah. Minta manager menolak atau meminta revisi lebih dulu bila ada yang harus diperbaiki.`,
      },
      { status: 400 }
    );
  }
  if (
    ["APPROVED", "PO_UPLOADED"].includes(existingQuotation.status) &&
    (existingQuotation.ltrs.length > 0 || existingQuotation.cocs.length > 0)
  ) {
    return NextResponse.json(
      {
        message:
          "Quotation tidak dapat diubah karena LTR/COC sudah terbit. Gunakan audit trail dan proses pembatalan dokumen terlebih dahulu.",
      },
      { status: 409 }
    );
  }

  // Menyunting draft sendiri bukan "revisi": nomor tidak boleh naik ke -R1
  // setiap kali sales menyimpan, dan statusnya tetap menunggu customer.
  const isDraftEdit = existingQuotation.status === "REQUESTED";

  const editReason = parsed.data.editReason?.trim() || "";

  // Dokumen yang sudah beredar wajib punya jejak alasan perubahan.
  if (!isDraftEdit && editReason.length < 8) {
    return NextResponse.json(
      { message: "Alasan perubahan minimal 8 karakter" },
      { status: 400 }
    );
  }

  const isCustomerRevision = existingQuotation.status === "REVISION";
  const wasApproved = ["APPROVED", "PO_UPLOADED"].includes(
    existingQuotation.status
  );

  const nextQuotationNo = isDraftEdit
    ? existingQuotation.quotationNo
    : (nextQuotationRevisionCode(
        existingQuotation.orderCode,
        existingQuotation.quotationNo
      ) ?? generateRevisionQuotationNo(existingQuotation.quotationNo));

  /**
   * Status setelah penyuntingan.
   *
   * Draft tetap REQUESTED — melompat ke VERIFIED akan melewati persetujuan
   * customer sepenuhnya. Balasan atas permintaan revisi customer masuk ke
   * NEGOTIATION. Sisanya (ditolak / sudah approved) wajib melewati approval
   * ulang, jadi kembali ke VERIFIED.
   */
  const nextStatus = isDraftEdit
    ? "REQUESTED"
    : isCustomerRevision
      ? "NEGOTIATION"
      : "VERIFIED";

  // Revisi dari portal customer: harga tetap milik Medialab.
  const isCustomerSubmission =
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT";

  // ---------- Jalur baru: quotation berbasis grup ----------
  if (parsed.data.groups?.length) {
    const resolved = await resolveQuotationContent(prisma, parsed.data.groups, {
      ignoreSubmittedPrices: isCustomerSubmission,
    });

    if (!resolved.ok) {
      return NextResponse.json({ message: resolved.message }, { status: 400 });
    }

    const totals = calculateQuotationTotals({
      totalAmount: resolved.content.totalAmount,
      samplingCost: isCustomerSubmission
        ? existingQuotation.samplingCost
        : parsed.data.samplingCost,
      vatPercent: isCustomerSubmission
        ? existingQuotation.vatPercent
        : parsed.data.vatPercent,
    });

    const quotation = await prisma.$transaction(async (tx) => {
      await captureQuotationRevision(tx, {
        entityId: id,
        action: "CREATED",
        session: permission.session!,
        request,
        changeSummary: "Baseline sebelum staff merevisi quotation",
      });

      // Item dihapus lebih dulu agar item lama yang belum punya grup ikut
      // tersapu; penghapusan grup sendiri sudah meng-cascade titik sampling.
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      await tx.quotationGroup.deleteMany({ where: { quotationId: id } });

      await tx.quotation.update({
        where: { id },
        data: {
          quotationNo: nextQuotationNo,
          customerId: parsed.data.customerId,
          note: parsed.data.note || existingQuotation.note,
          revisionReason: editReason || existingQuotation.revisionReason,
          postApprovalEditReason: wasApproved ? editReason : null,

          quotationDate:
            toDate(parsed.data.quotationDate) ||
            existingQuotation.quotationDate ||
            new Date(),
          validUntil: toDate(parsed.data.validUntil),

          samplingBy: parsed.data.samplingBy || existingQuotation.samplingBy,
          testingObjective:
            parsed.data.testingObjective || existingQuotation.testingObjective,
          tatRequested:
            parsed.data.tatRequested || existingQuotation.tatRequested,

          pricingStatus: resolved.content.pricingStatus,
          totalAmount: totals.totalAmount,
          samplingCost: totals.samplingCost,
          vatPercent: totals.vatPercent,
          vatAmount: totals.vatAmount,
          grandTotal: totals.grandTotal,

          paymentTerm: parsed.data.paymentTerm || null,
          termsNote: parsed.data.termsNote || null,

          status: nextStatus,
          verifiedById: null,
          approvedById: null,
        },
      });

      await persistQuotationContent(tx, id, resolved.content);

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
        reason: editReason || undefined,
        changeSummary: wasApproved
          ? `Quotation approved diedit menjadi ${nextQuotationNo}; wajib approval ulang`
          : `Quotation direvisi menjadi ${nextQuotationNo}`,
      });

      return tx.quotation.findUniqueOrThrow({
        where: { id },
        include: QUOTATION_INCLUDE,
      });
    }, TRANSACTION_OPTIONS);

    const unpricedNote =
      resolved.content.unpricedCount > 0
        ? ` ${resolved.content.unpricedCount} parameter belum berharga.`
        : "";

    return NextResponse.json({
      message:
        (isCustomerRevision
          ? `Quotation berhasil direvisi dan dikirim ke customer sebagai ${nextQuotationNo}.`
          : `Quotation berhasil direvisi sebagai ${nextQuotationNo} dan dikirim untuk approval ulang.`) +
        unpricedNote,
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
  });

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
        revisionReason: editReason || existingQuotation.revisionReason,
        postApprovalEditReason: wasApproved ? editReason : null,

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

        status: nextStatus,
        verifiedById: null,
        approvedById: null,
        items: {
          create: legacyItems.map((item) => {
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
      reason: editReason || undefined,
      changeSummary: wasApproved
        ? `Quotation approved diedit menjadi ${nextQuotationNo}; wajib approval ulang`
        : `Quotation direvisi menjadi ${nextQuotationNo}`,
    });

    return updated;
  });

  return NextResponse.json({
    message: isCustomerRevision
      ? `Quotation berhasil direvisi dan dikirim ke customer sebagai ${nextQuotationNo}`
      : `Quotation berhasil direvisi sebagai ${nextQuotationNo} dan dikirim untuk approval ulang`,
    quotation,
  });
}
