import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
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

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description || null;
  if (parsed.data.icon !== undefined) data.icon = parsed.data.icon || null;
  if (parsed.data.sort !== undefined) data.sort = parsed.data.sort;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  const category = await prisma.faqCategory.update({
    where: { id },
    data,
  });

  return NextResponse.json({ message: "Kategori diperbarui", category });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("support.faq", "canDelete");
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const linkedTickets = await prisma.supportTicket.count({
    where: { categoryId: id },
  });

  // Kalau sudah dipakai tiket, jangan hard-delete — cukup nonaktifkan.
  if (linkedTickets > 0) {
    await prisma.faqItem.deleteMany({ where: { categoryId: id } });
    const category = await prisma.faqCategory.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      message: "Kategori dipakai tiket, dinonaktifkan (item dihapus)",
      category,
    });
  }

  await prisma.faqItem.deleteMany({ where: { categoryId: id } });
  await prisma.faqCategory.delete({ where: { id } });

  return NextResponse.json({ message: "Kategori dihapus" });
}
