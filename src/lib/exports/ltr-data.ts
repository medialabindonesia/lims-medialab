import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

export async function getAuthorizedLtrForExport(ltrId: string) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canView" },
    { menuKey: "quotation.verify", action: "canView" },
    { menuKey: "quotation.revise", action: "canView" },
    { menuKey: "quotation.approve", action: "canView" },
    { menuKey: "sales.ltr", action: "canView" },
    { menuKey: "technical.coc", action: "canView" },
    { menuKey: "technical.stps", action: "canView" },
  ]);

  if (!permission.allowed) {
    return {
      ltr: null,
      response: permission.response,
    };
  }

  const ltr = await prisma.ltr.findUnique({
    where: {
      id: ltrId,
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
          coc: true,
          stps: true,
          samples: true,
        },
      },
    },
  });

  if (!ltr) {
    return {
      ltr: null,
      response: NextResponse.json(
        { message: "LTR tidak ditemukan" },
        { status: 404 }
      ),
    };
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    ltr.quotation.customerId !== permission.session.customerId
  ) {
    return {
      ltr: null,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ltr,
    response: null,
  };
}