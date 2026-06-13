import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    quotation.customerId !== permission.session.customerId
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (quotation.status !== "REQUESTED" && quotation.status !== "NEGOTIATION") {
    return NextResponse.json(
      {
        message:
          "Quotation hanya bisa di-ACC saat status REQUESTED / NEGOTIATION",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: "CONFIRMED",
    },
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "CUSTOMER_CONFIRM_QUOTATION",
      note: `Customer confirmed quotation ${quotation.quotationNo}`,
    },
  });

  return NextResponse.json({
    message: "Quotation berhasil di-ACC customer",
    quotation: updated,
  });
}