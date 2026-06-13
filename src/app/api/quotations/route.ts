import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

const quotationCreateSchema = z.object({
  customerId: z.string().optional(),
  coaTemplateId: z.string().min(1, "Template COA wajib dipilih"),
  note: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        parameterId: z.string().min(1, "Parameter wajib dipilih"),
        qty: z.coerce.number().int().min(1, "Qty minimal 1"),
      })
    )
    .min(1, "Minimal pilih 1 parameter"),
});

export async function GET(request: Request) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canView" },
    { menuKey: "quotation.verify", action: "canView" },
    { menuKey: "quotation.revise", action: "canView" },
    { menuKey: "quotation.approve", action: "canView" },
    { menuKey: "sales.ltr", action: "canView" },
    { menuKey: "technical.coc", action: "canView" },
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
      invoice: true,
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
    const price = priceMap.get(item.parameterId) || 0;
    return total + price * item.qty;
  }, 0);

  const quotation = await prisma.quotation.create({
    data: {
      quotationNo: generateDocumentNo("QT"),
      customerId,
      coaTemplateId: parsed.data.coaTemplateId,
      note: parsed.data.note || null,
      totalAmount,
      status: "REQUESTED",
      requestedById: permission.session?.userId,
      items: {
        create: parsed.data.items.map((item) => ({
          parameterId: item.parameterId,
          qty: item.qty,
          price: priceMap.get(item.parameterId) || 0,
        })),
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