import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  requireAnyApiPermission,
  requireApiPermission,
} from "@/lib/api-permission";

const cannedSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(80),
  body: z.string().trim().min(2, "Isi minimal 2 karakter").max(2000),
  sort: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/** List canned replies aktif. Bisa diakses agent (desk) maupun pengelola FAQ. */
export async function GET() {
  const permission = await requireAnyApiPermission([
    { menuKey: "support.desk", action: "canView" },
    { menuKey: "support.faq", action: "canView" },
  ]);
  if (!permission.allowed) return permission.response;

  const replies = await prisma.cannedReply.findMany({
    where: { isActive: true },
    orderBy: { sort: "asc" },
  });

  return NextResponse.json({ replies });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("support.faq", "canCreate");
  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = cannedSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const reply = await prisma.cannedReply.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      sort: parsed.data.sort ?? 0,
      isActive: parsed.data.isActive ?? true,
      createdById: permission.session?.userId,
    },
  });

  return NextResponse.json({ message: "Canned reply dibuat", reply });
}
