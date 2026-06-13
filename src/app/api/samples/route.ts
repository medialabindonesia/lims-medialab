import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

const createSampleSchema = z.object({
  quotationId: z.string().min(1, "Quotation wajib dipilih"),
});

export async function GET() {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canView" },
    { menuKey: "lab.receive_sample", action: "canView" },
    { menuKey: "lab.distribute_parameter", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const where =
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId
      ? {
          customerId: permission.session.customerId,
        }
      : undefined;

  const samples = await prisma.sample.findMany({
    where,
    include: {
      customer: true,
      quotation: true,
      coaTemplate: true,
      parameters: {
        include: {
          parameter: true,
          templateParameter: true,
        },
      },
      coc: true,
      coa: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ samples });
}

export async function POST(request: Request) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
    { menuKey: "lab.receive_sample", action: "canCreate" },
  ]);

  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = createSampleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: {
      id: parsed.data.quotationId,
    },
    include: {
      items: true,
      samples: true,
      coc: true,
      coaTemplate: {
        include: {
          parameters: true,
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

  if (quotation.status !== "COC_CREATED") {
    return NextResponse.json(
      { message: "Sample hanya bisa dibuat setelah COC_CREATED" },
      { status: 400 }
    );
  }

  if (!quotation.coaTemplateId || !quotation.coaTemplate) {
    return NextResponse.json(
      { message: "Quotation belum memiliki Template COA" },
      { status: 400 }
    );
  }

  const existingSample = await prisma.sample.findFirst({
    where: {
      quotationId: quotation.id,
    },
  });

  if (existingSample) {
    return NextResponse.json(
      { message: "Sample untuk quotation ini sudah pernah dibuat" },
      { status: 400 }
    );
  }

  if (quotation.items.length === 0) {
    return NextResponse.json(
      { message: "Quotation belum memiliki parameter" },
      { status: 400 }
    );
  }

  const templateParameterMap = new Map(
    quotation.coaTemplate.parameters.map((item) => [item.parameterId, item.id])
  );

  const sample = await prisma.sample.create({
    data: {
      sampleNo: generateDocumentNo("SPL"),
      quotationId: quotation.id,
      customerId: quotation.customerId,
      coaTemplateId: quotation.coaTemplateId,
      status: "SAMPLE_SENT",
      sentByCustomerAt: new Date(),
      parameters: {
        create: quotation.items.map((item) => ({
          parameterId: item.parameterId,
          templateParameterId: templateParameterMap.get(item.parameterId) || null,
          status: "WAITING",
        })),
      },
    },
    include: {
      customer: true,
      quotation: true,
      coaTemplate: true,
      parameters: {
        include: {
          parameter: true,
          templateParameter: true,
        },
      },
      coc: true,
      coa: true,
    },
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      sampleId: sample.id,
      action: "CREATE_SAMPLE_FROM_QUOTATION",
      note: `Sample ${sample.sampleNo} created from quotation ${quotation.quotationNo}`,
    },
  });

  return NextResponse.json({
    message: "Sample berhasil dibuat / dikirim customer",
    sample,
  });
}