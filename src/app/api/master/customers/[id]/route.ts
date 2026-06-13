import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const customerSchema = z.object({
  name: z.string().min(1, "Nama customer wajib diisi"),
  company: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.customers", "canView");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    return NextResponse.json(
      { message: "Customer tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ customer });
}

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.customers", "canUpdate");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Data tidak valid",
      },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({
    message: "Customer berhasil diupdate",
    customer,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.customers", "canDelete");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      isActive: false,
    },
  });

  return NextResponse.json({
    message: "Customer berhasil dinonaktifkan",
    customer,
  });
}