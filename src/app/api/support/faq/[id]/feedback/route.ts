import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

/** Feedback FAQ (Ya/Tidak). Cukup sesi login apa pun. */
export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = feedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data tidak valid" },
      { status: 400 }
    );
  }

  const item = await prisma.faqItem.findUnique({ where: { id } });

  if (!item) {
    return NextResponse.json(
      { message: "FAQ tidak ditemukan" },
      { status: 404 }
    );
  }

  await prisma.faqItem.update({
    where: { id },
    data: parsed.data.helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
