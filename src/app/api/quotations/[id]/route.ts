import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateRevisionQuotationNo } from "@/lib/document-number";

const quotationUpdateSchema = z.object({
  customerId: z.string().min(1, "Customer wajib dipilih"),
  coaTemplateId: z.string().min(1, "Template COA wajib dipilih"),
  note: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        parameterId: z.string().min(1, "Parameter wajib dipilih"),
        qty: z.coerce.number().int().min(1, "Qty minimal 1"),
        customPrice: z.coerce.number().min(0).optional(),
      })
    )
    .min(1, "Minimal pilih 1 parameter"),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canView" },
    { menuKey: "quotation.verify", action: "canView" },
    { menuKey: "quotation.revise", action: "canView" },
    { menuKey: "quotation.approve", action: "canView" },
    { menuKey: "sales.ltr", action: "canView" },
    { menuKey: "technical.coc", action: "canView" },
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
      parameters: true,
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

  const totalAmount = parsed.data.items.reduce((total, item) => {
    const price = item.customPrice ?? priceMap.get(item.parameterId) ?? 0;
    return total + price * item.qty;
  }, 0);

  const nextQuotationNo = generateRevisionQuotationNo(
    existingQuotation.quotationNo
  );

  const quotation = await prisma.$transaction(async (tx) => {
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
        totalAmount,
        status: "NEGOTIATION",
        verifiedById: null,
        approvedById: null,
        items: {
          create: parsed.data.items.map((item) => {
            const price =
              item.customPrice ?? priceMap.get(item.parameterId) ?? 0;

            return {
              parameterId: item.parameterId,
              qty: item.qty,
              price,
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
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        action: "STAFF_REVISE_QUOTATION",
        note: `Quotation revised from ${existingQuotation.quotationNo} to ${nextQuotationNo}`,
      },
    });

    return updated;
  });

  return NextResponse.json({
    message: `Quotation berhasil direvisi dan dikirim ke customer sebagai ${nextQuotationNo}`,
    quotation,
  });
}