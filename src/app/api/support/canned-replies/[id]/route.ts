import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  body: z.string().trim().min(2).max(2000).optional(),
  sort: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("support.faq", "canUpdate");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const reply = await prisma.cannedReply.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ message: "Canned reply diperbarui", reply });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("support.faq", "canDelete");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  await prisma.cannedReply.delete({ where: { id } });

  return NextResponse.json({ message: "Canned reply dihapus" });
}
