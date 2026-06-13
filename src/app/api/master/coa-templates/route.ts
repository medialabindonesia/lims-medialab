import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const templateParameterSchema = z.object({
  parameterId: z.string().min(1, "Parameter wajib dipilih"),
  displayName: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  standard: z.string().optional().nullable(),
  limitValue: z.string().optional().nullable(),
  sort: z.coerce.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Nama template wajib diisi"),
  code: z.string().min(1, "Kode template wajib diisi"),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  parameters: z.array(templateParameterSchema).optional(),
});

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replaceAll(" ", "_");
}

export async function GET() {
  const permission = await requireApiPermission("master.coa_templates", "canView");
  if (!permission.allowed) return permission.response;

  const templates = await prisma.coaTemplate.findMany({
    include: {
      parameters: {
        include: {
          parameter: true,
        },
        orderBy: {
          sort: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const parameters = await prisma.analysisParameter.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json({
    templates,
    parameters,
  });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("master.coa_templates", "canCreate");
  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = templateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const code = normalizeCode(parsed.data.code);

  const existing = await prisma.coaTemplate.findUnique({
    where: { code },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Kode template sudah digunakan" },
      { status: 400 }
    );
  }

  const parameterIds = [
    ...new Set((parsed.data.parameters || []).map((item) => item.parameterId)),
  ];

  if (parameterIds.length > 0) {
    const validParams = await prisma.analysisParameter.findMany({
      where: {
        id: {
          in: parameterIds,
        },
        isActive: true,
      },
    });

    if (validParams.length !== parameterIds.length) {
      return NextResponse.json(
        { message: "Ada parameter yang tidak valid / tidak aktif" },
        { status: 400 }
      );
    }
  }

  const template = await prisma.coaTemplate.create({
    data: {
      name: parsed.data.name,
      code,
      description: parsed.data.description || null,
      isActive: parsed.data.isActive ?? true,
      parameters: {
        create: (parsed.data.parameters || []).map((item, index) => ({
          parameterId: item.parameterId,
          displayName: item.displayName || null,
          unit: item.unit || null,
          method: item.method || null,
          standard: item.standard || null,
          limitValue: item.limitValue || null,
          sort: item.sort ?? index + 1,
          isRequired: item.isRequired ?? true,
          isActive: item.isActive ?? true,
        })),
      },
    },
    include: {
      parameters: {
        include: {
          parameter: true,
        },
        orderBy: {
          sort: "asc",
        },
      },
    },
  });

  return NextResponse.json({
    message: "Template COA berhasil dibuat",
    template,
  });
}