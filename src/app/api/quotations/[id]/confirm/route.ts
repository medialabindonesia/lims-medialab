import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * ACC customer atas scope penawaran — ditekan CUSTOMER SENDIRI lewat portal.
 *
 * Endpoint ini sengaja tidak bisa dipakai staf. Izinnya hanya bersandar pada
 * `quotation.request` + canUpdate, dan izin itu kini juga dipegang sales agar
 * mereka bisa menyusun penawaran; tanpa penguncian di bawah, sales bisa
 * meng-ACC atas nama customer sementara log mencatatnya sebagai persetujuan
 * customer. Persetujuan yang diterima di luar aplikasi dicatat lewat
 * `/confirm-offline`, yang menyimpan siapa yang mencatat dan buktinya.
 */
export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
  ]);

  if (!permission.allowed) return permission.response;

  if (permission.session?.roleCode !== "CUSTOMER_ENGAGEMENT") {
    return NextResponse.json(
      {
        message:
          "Hanya customer yang bisa meng-ACC penawarannya sendiri. Bila persetujuan diterima lewat telepon, email, atau rapat, gunakan 'Tandai ACC di luar sistem'.",
      },
      { status: 403 }
    );
  }

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
      confirmedAt: new Date(),
      confirmedById: permission.session?.userId,
      // Customer menekannya sendiri, jadi bukan konfirmasi tangan kedua.
      confirmedOffline: false,
      offlineConfirmationChannel: null,
      offlineConfirmationNote: null,
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