import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

const createLtrSchema = z.object({
  groupLabel: z.string().trim().min(3).max(120).optional(),
  itemIds: z.array(z.string().min(1)).min(1).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "sales.ltr", action: "canCreate" },
  ]);
  if (!permission.allowed) return permission.response;

  const { id } = await context.params;
  const rawBody = await request.text();
  const parsed = createLtrSchema.safeParse(rawBody ? JSON.parse(rawBody) : {});
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data LTR tidak valid" },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      purchaseOrder: true,
      items: { orderBy: { id: "asc" } },
      ltrs: { include: { items: true }, orderBy: { sequence: "asc" } },
    },
  });

  if (!quotation) {
    return NextResponse.json({ message: "Quotation tidak ditemukan" }, { status: 404 });
  }
  if (!quotation.purchaseOrder) {
    return NextResponse.json(
      { message: "LTR hanya bisa dibuat setelah PO diunggah" },
      { status: 400 }
    );
  }
  if (!["PO_UPLOADED", "LTR_CREATED", "COC_CREATED"].includes(quotation.status)) {
    return NextResponse.json(
      { message: "Status quotation belum siap untuk pembuatan LTR" },
      { status: 400 }
    );
  }

  const quotationItemIds = new Set(quotation.items.map((item) => item.id));
  const assignedItemIds = new Set(
    quotation.ltrs.flatMap((ltr) => ltr.items.map((item) => item.quotationItemId))
  );
  const requestedIds = parsed.data.itemIds ?? quotation.items
    .map((item) => item.id)
    .filter((itemId) => !assignedItemIds.has(itemId));
  const uniqueItemIds = [...new Set(requestedIds)];

  if (uniqueItemIds.length === 0) {
    return NextResponse.json(
      { message: "Semua titik uji sudah masuk ke LTR lain" },
      { status: 400 }
    );
  }
  if (uniqueItemIds.some((itemId) => !quotationItemIds.has(itemId))) {
    return NextResponse.json(
      { message: "Ada titik uji yang bukan milik quotation ini" },
      { status: 400 }
    );
  }
  if (uniqueItemIds.some((itemId) => assignedItemIds.has(itemId))) {
    return NextResponse.json(
      { message: "Satu atau lebih titik uji sudah masuk ke LTR lain" },
      { status: 409 }
    );
  }

  const sequence = Math.max(0, ...quotation.ltrs.map((item) => item.sequence)) + 1;
  const result = await prisma.$transaction(async (tx) => {
    const ltr = await tx.ltr.create({
      data: {
        quotationId: id,
        sequence,
        groupLabel: parsed.data.groupLabel || `Bagian ${sequence}`,
        ltrNo: generateDocumentNo(`LTR-${String(sequence).padStart(2, "0")}`),
        createdById: permission.session?.userId,
        items: {
          create: uniqueItemIds.map((quotationItemId, sort) => ({
            quotationItemId,
            sort,
          })),
        },
      },
      include: { items: { include: { quotationItem: true }, orderBy: { sort: "asc" } } },
    });

    const updatedQuotation = await tx.quotation.update({
      where: { id },
      data: {
        status: quotation.status === "COC_CREATED" ? "COC_CREATED" : "LTR_CREATED",
        ...(quotation.primaryLtrId ? {} : { primaryLtrId: ltr.id }),
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        action: "CREATE_LTR",
        note: `LTR ${ltr.ltrNo} (${ltr.groupLabel}) dibuat dari ${uniqueItemIds.length} titik uji quotation ${quotation.quotationNo}`,
      },
    });

    return { ltr, quotation: updatedQuotation };
  });

  return NextResponse.json({
    message: `LTR bagian ${sequence} berhasil dibuat`,
    ...result,
  });
}
