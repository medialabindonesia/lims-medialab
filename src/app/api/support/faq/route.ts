import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { FaqCategoryDTO } from "@/lib/support";

/** Daftar FAQ aktif (kategori + item) untuk semua sesi login. */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.faqCategory.findMany({
    where: { isActive: true },
    orderBy: { sort: "asc" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sort: "asc" },
      },
    },
  });

  const payload: FaqCategoryDTO[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    items: category.items.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      helpfulCount: item.helpfulCount,
      notHelpfulCount: item.notHelpfulCount,
    })),
  }));

  return NextResponse.json({ categories: payload });
}
