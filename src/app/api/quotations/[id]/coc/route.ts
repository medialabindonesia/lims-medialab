import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

const createCocSchema = z.object({
  groupLabel: z.string().trim().min(3).max(120).optional(),
  itemIds: z.array(z.string().min(1)).min(1).optional(),
  ltrId: z.string().min(1).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "technical.coc", action: "canCreate" },
  ]);
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const rawBody = await request.text();
  const parsed = createCocSchema.safeParse(rawBody ? JSON.parse(rawBody) : {});
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data COC tidak valid" },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      ltrs: true,
      cocs: { include: { items: true }, orderBy: { sequence: "asc" } },
    },
  });
  if (!quotation) {
    return NextResponse.json({ message: "Quotation tidak ditemukan" }, { status: 404 });
  }
  if (!["APPROVED", "PO_UPLOADED", "LTR_CREATED", "COC_CREATED"].includes(quotation.status)) {
    return NextResponse.json(
      { message: "COC dapat dibuat langsung setelah quotation disetujui" },
      { status: 400 }
    );
  }

  const ltrId = parsed.data.ltrId || null;
  if (ltrId && !quotation.ltrs.some((ltr) => ltr.id === ltrId)) {
    return NextResponse.json({ message: "LTR bukan milik quotation ini" }, { status: 400 });
  }

  const quotationItemIds = new Set(quotation.items.map((item) => item.id));
  const assignedItemIds = new Set(
    quotation.cocs.flatMap((coc) => coc.items.map((item) => item.quotationItemId))
  );
  const requestedIds = parsed.data.itemIds ?? quotation.items
    .map((item) => item.id)
    .filter((itemId) => !assignedItemIds.has(itemId));
  const uniqueItemIds = [...new Set(requestedIds)];
  if (uniqueItemIds.length === 0) {
    return NextResponse.json({ message: "Semua titik uji sudah masuk ke COC lain" }, { status: 400 });
  }
  if (uniqueItemIds.some((itemId) => !quotationItemIds.has(itemId))) {
    return NextResponse.json({ message: "Ada titik uji yang tidak valid" }, { status: 400 });
  }
  if (uniqueItemIds.some((itemId) => assignedItemIds.has(itemId))) {
    return NextResponse.json({ message: "Titik uji sudah masuk ke COC lain" }, { status: 409 });
  }

  const sequence = Math.max(0, ...quotation.cocs.map((item) => item.sequence)) + 1;
  const result = await prisma.$transaction(async (tx) => {
    const coc = await tx.coc.create({
      data: {
        quotationId: id,
        ltrId,
        sequence,
        groupLabel: parsed.data.groupLabel || `Bagian ${sequence}`,
        cocNo: generateDocumentNo(`COC-${String(sequence).padStart(2, "0")}`),
        createdById: permission.session?.userId,
        items: {
          create: uniqueItemIds.map((quotationItemId, sort) => ({ quotationItemId, sort })),
        },
      },
      include: { items: true },
    });
    const updatedQuotation = await tx.quotation.update({
      where: { id },
      data: {
        status: "COC_CREATED",
        ...(quotation.primaryCocId ? {} : { primaryCocId: coc.id }),
      },
    });
    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        action: "CREATE_COC",
        note: `COC ${coc.cocNo} dibuat langsung dari ${uniqueItemIds.length} titik uji quotation ${quotation.quotationNo}${ltrId ? " dengan LTR" : " tanpa LTR"}`,
      },
    });
    return { coc, quotation: updatedQuotation };
  });

  return NextResponse.json({ message: `COC bagian ${sequence} berhasil dibuat`, ...result });
}
