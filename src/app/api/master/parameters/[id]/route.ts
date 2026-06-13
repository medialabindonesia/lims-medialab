import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const parameterSchema = z.object({
  name: z.string().min(1, "Nama parameter wajib diisi"),
  unit: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "Harga tidak boleh minus"),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.parameters", "canView");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const parameter = await prisma.analysisParameter.findUnique({
    where: { id },
  });

  if (!parameter) {
    return NextResponse.json(
      { message: "Parameter tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ parameter });
}

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.parameters", "canUpdate");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = parameterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Data tidak valid",
      },
      { status: 400 }
    );
  }

  const parameter = await prisma.analysisParameter.update({
    where: { id },
    data: {
      name: parsed.data.name,
      unit: parsed.data.unit || null,
      method: parsed.data.method || null,
      price: parsed.data.price,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({
    message: "Parameter berhasil diupdate",
    parameter,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.parameters", "canDelete");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const parameter = await prisma.analysisParameter.update({
    where: { id },
    data: {
      isActive: false,
    },
  });

  return NextResponse.json({
    message: "Parameter berhasil dinonaktifkan",
    parameter,
  });
}