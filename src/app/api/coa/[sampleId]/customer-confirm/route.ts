import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "coa.preliminary", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      coa: true,
    },
  });

  if (!sample) {
    return NextResponse.json(
      { message: "Sample tidak ditemukan" },
      { status: 404 }
    );
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    sample.customerId !== permission.session.customerId
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const preliminary = sample.coa.find((item) => item.type === "PRELIMINARY");

  if (!preliminary) {
    return NextResponse.json(
      { message: "Preliminary COA belum dibuat" },
      { status: 400 }
    );
  }

  if (preliminary.status !== "SENT_TO_CUSTOMER") {
    return NextResponse.json(
      { message: "Preliminary COA tidak dalam status menunggu konfirmasi customer" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const coa = await tx.coa.update({
      where: {
        id: preliminary.id,
      },
      data: {
        status: "CUSTOMER_CONFIRMED",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "CUSTOMER_CONFIRM_PRELIMINARY_COA",
        note: `Customer confirmed preliminary COA ${preliminary.coaNo}`,
      },
    });

    return coa;
  });

  return NextResponse.json({
    message: "Preliminary COA berhasil dikonfirmasi customer",
    coa: updated,
  });
}