import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const createUserSchema = z.object({
  name: z.string().min(1, "Nama user wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  roleId: z.string().min(1, "Role wajib dipilih"),
  customerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const permission = await requireApiPermission("admin.users", "canView");
  if (!permission.allowed) return permission.response;

  const [users, roles, customers] = await Promise.all([
    prisma.user.findMany({
      include: {
        role: true,
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.customer.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return NextResponse.json({
    users,
    roles,
    customers,
  });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("admin.users", "canCreate");
  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase(),
    },
  });

  if (existingUser) {
    return NextResponse.json(
      { message: "Email sudah digunakan user lain" },
      { status: 400 }
    );
  }

  const role = await prisma.role.findUnique({
    where: {
      id: parsed.data.roleId,
    },
  });

  if (!role) {
    return NextResponse.json(
      { message: "Role tidak ditemukan" },
      { status: 404 }
    );
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      password: hashedPassword,
      roleId: parsed.data.roleId,
      customerId: parsed.data.customerId || null,
      isActive: parsed.data.isActive ?? true,
    },
    include: {
      role: true,
      customer: true,
    },
  });

  return NextResponse.json({
    message: "User berhasil dibuat",
    user,
  });
}