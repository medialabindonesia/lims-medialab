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

  const menus = await prisma.menu.findMany({
    orderBy: {
      sort: "asc",
    },
  });

  return NextResponse.json({ menus });
}