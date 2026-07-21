import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

const itemSchema = z.object({
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  question: z.string().trim().min(3, "Pertanyaan minimal 3 karakter").max(400),
  answer: z.string().trim().min(3, "Jawaban minimal 3 karakter").max(4000),
  sort: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const permission = await requireApiPermission("support.faq", "canCreate");
  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = itemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const category = await prisma.faqCategory.findUnique({
    where: { id: parsed.data.categoryId },
  });

  if (!category) {
    return NextResponse.json(
      { message: "Kategori tidak ditemukan" },
      { status: 404 }
    );
  }

  const item = await prisma.faqItem.create({
    data: {
      categoryId: parsed.data.categoryId,
      question: parsed.data.question,
      answer: parsed.data.answer,
      sort: parsed.data.sort ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ message: "FAQ dibuat", item });
}
