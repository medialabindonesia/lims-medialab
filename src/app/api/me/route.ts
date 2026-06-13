import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserMenus } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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

  const menus = await getUserMenus(user.roleId);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customer: user.customer,
    },
    menus,
  });
}