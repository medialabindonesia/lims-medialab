import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const accountSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("master.customers", "canUpdate");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = accountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message || "Data tidak valid",
      },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    return NextResponse.json(
      { message: "Customer tidak ditemukan" },
      { status: 404 }
    );
  }

  if (!customer.email) {
    return NextResponse.json(
      { message: "Customer harus punya email dulu untuk dibuat akun login" },
      { status: 400 }
    );
  }

  const customerRole = await prisma.role.findUnique({
    where: {
      code: "CUSTOMER_ENGAGEMENT",
    },
  });

  if (!customerRole) {
    return NextResponse.json(
      { message: "Role CUSTOMER_ENGAGEMENT tidak ditemukan" },
      { status: 404 }
    );
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.upsert({
    where: {
      email: customer.email.toLowerCase(),
    },
    update: {
      name: customer.name,
      password: hashedPassword,
      roleId: customerRole.id,
      customerId: customer.id,
      isActive: true,
    },
    create: {
      name: customer.name,
      email: customer.email.toLowerCase(),
      password: hashedPassword,
      roleId: customerRole.id,
      customerId: customer.id,
      isActive: true,
    },
  });

  return NextResponse.json({
    message: "Akun login customer berhasil dibuat / direset",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}