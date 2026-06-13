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

export async function GET(request: Request) {
  const permission = await requireApiPermission("master.customers", "canView");
  if (!permission.allowed) return permission.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { company: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("master.customers", "canCreate");
  if (!permission.allowed) return permission.response;

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

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({
    message: "Customer berhasil dibuat",
    customer,
  });
}