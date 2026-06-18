import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

export async function getAuthorizedInvoiceForExport(invoiceId: string) {
  const permission = await requireAnyApiPermission([
    { menuKey: "finance.create_invoice", action: "canView" },
    { menuKey: "finance.approve_invoice", action: "canView" },
    { menuKey: "customer.invoices", action: "canView" },
    { menuKey: "admin.rbac", action: "canView" },
  ]);

  if (!permission.allowed) {
    return {
      invoice: null,
      response: permission.response,
    };
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
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
            orderBy: {
              id: "asc",
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
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    return {
      invoice: null,
      response: NextResponse.json(
        { message: "Invoice tidak ditemukan" },
        { status: 404 }
      ),
    };
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    invoice.quotation.customerId !== permission.session.customerId
  ) {
    return {
      invoice: null,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    invoice,
    response: null,
  };
}