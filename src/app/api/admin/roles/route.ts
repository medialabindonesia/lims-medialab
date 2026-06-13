import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session || session.roleCode !== "SUPER_ADMIN") {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const roles = await prisma.role.findMany({
    include: {
      roleMenus: {
        include: {
          menu: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json({ roles });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.roleCode !== "SUPER_ADMIN") {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await request.json();

  const name = String(body.name || "").trim();
  const code = String(body.code || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");

  if (!name || !code) {
    return NextResponse.json(
      { message: "Nama role dan code wajib diisi" },
      { status: 400 }
    );
  }

  const role = await prisma.role.create({
    data: {
      name,
      code,
    },
  });

  const menus = await prisma.menu.findMany();

  await prisma.roleMenu.createMany({
    data: menus.map((menu) => ({
      roleId: role.id,
      menuId: menu.id,
      canView: false,
    })),
  });

  return NextResponse.json({
    message: "Role berhasil dibuat",
    role,
  });
}