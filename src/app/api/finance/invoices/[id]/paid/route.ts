import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "finance.approve_invoice",
    "canUpdate"
  );

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    return NextResponse.json(
      { message: "Invoice tidak ditemukan" },
      { status: 404 }
    );
  }

  if (invoice.status !== "SENT" && invoice.status !== "APPROVED") {
    return NextResponse.json(
      { message: "Invoice hanya bisa ditandai paid setelah SENT / APPROVED" },
      { status: 400 }
    );
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: "PAID",
    },
    include: {
      quotation: {
        include: {
          customer: true,
          coaTemplate: true,
          items: {
            include: {
              parameter: true,
            },
          },
          purchaseOrder: true,
          ltr: true,
          coc: {
            include: {
              sample: true,
            },
          },
          stps: true,
          samples: {
            include: {
              coa: true,
              coaTemplate: true,
            },
          },
        },
      },
    },
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "MARK_INVOICE_PAID",
      note: `Invoice ${invoice.invoiceNo} marked as paid`,
    },
  });

  return NextResponse.json({
    message: "Invoice berhasil ditandai PAID",
    invoice: updated,
  });
}