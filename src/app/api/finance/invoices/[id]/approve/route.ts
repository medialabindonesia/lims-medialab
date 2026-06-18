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
    "canApprove"
  );

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      quotation: true,
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { message: "Invoice tidak ditemukan" },
      { status: 404 }
    );
  }

  if (invoice.status !== "WAITING_APPROVAL") {
    return NextResponse.json(
      { message: "Invoice hanya bisa di-approve dari status WAITING_APPROVAL" },
      { status: 400 }
    );
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById: permission.session?.userId,
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
      action: "APPROVE_INVOICE",
      note: `Invoice ${invoice.invoiceNo} approved`,
    },
  });

  return NextResponse.json({
    message: "Invoice berhasil di-approve",
    invoice: updated,
  });
}