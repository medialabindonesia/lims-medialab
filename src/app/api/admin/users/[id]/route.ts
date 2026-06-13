import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const updateUserSchema = z.object({
  name: z.string().min(1, "Nama user wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().optional().nullable(),
  roleId: z.string().min(1, "Role wajib dipilih"),
  customerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("admin.users", "canView");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      customer: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "User tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("admin.users", "canUpdate");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();

  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!currentUser) {
    return NextResponse.json(
      { message: "User tidak ditemukan" },
      { status: 404 }
    );
  }

  const emailUsedByOtherUser = await prisma.user.findFirst({
    where: {
      email: parsed.data.email.toLowerCase(),
      NOT: {
        id,
      },
    },
  });

  if (emailUsedByOtherUser) {
    return NextResponse.json(
      { message: "Email sudah digunakan user lain" },
      { status: 400 }
    );
  }

  const passwordData =
    parsed.data.password && parsed.data.password.length >= 6
      ? {
          password: await bcrypt.hash(parsed.data.password, 10),
        }
      : {};

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      roleId: parsed.data.roleId,
      customerId: parsed.data.customerId || null,
      isActive: parsed.data.isActive ?? true,
      ...passwordData,
    },
    include: {
      role: true,
      customer: true,
    },
  });

  return NextResponse.json({
    message: "User berhasil diupdate",
    user,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("admin.users", "canDelete");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const user = await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
    },
    include: {
      role: true,
      customer: true,
    },
  });

  return NextResponse.json({
    message: "User berhasil dinonaktifkan",
    user,
  });
}