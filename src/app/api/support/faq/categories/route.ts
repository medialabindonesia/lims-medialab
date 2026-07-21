import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  description: z.string().trim().max(500).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
  sort: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/** List semua kategori (termasuk nonaktif) + item, untuk halaman management. */
export async function GET() {
  const permission = await requireApiPermission("support.faq", "canView");
  if (!permission.allowed) return permission.response;

  const categories = await prisma.faqCategory.findMany({
    orderBy: { sort: "asc" },
    include: {
      items: { orderBy: { sort: "asc" } },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission("support.faq", "canCreate");
  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  let slug = slugify(parsed.data.name);
  const existing = await prisma.faqCategory.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const category = await prisma.faqCategory.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      sort: parsed.data.sort ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ message: "Kategori dibuat", category });
}
