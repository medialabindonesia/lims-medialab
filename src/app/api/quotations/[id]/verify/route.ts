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
    { menuKey: "quotation.verify", action: "canValidate" },
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

  if (quotation.status !== "CONFIRMED") {
    return NextResponse.json(
      {
        message:
          "Quotation hanya bisa diverifikasi setelah customer ACC / CONFIRMED",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: "VERIFIED",
      verifiedById: permission.session?.userId,
    },
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "VERIFY_QUOTATION",
      note: `Quotation ${quotation.quotationNo} verified`,
    },
  });

  return NextResponse.json({
    message: "Quotation berhasil diverifikasi",
    quotation: updated,
  });
}