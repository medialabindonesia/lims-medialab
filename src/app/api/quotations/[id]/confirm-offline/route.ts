import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { captureQuotationRevision } from "@/lib/revision-audit";

/**
 * Mencatat persetujuan customer yang diterima DI LUAR aplikasi.
 *
 * Banyak customer Medialab menyetujui penawaran lewat telepon, balasan email,
 * atau saat rapat — tidak semuanya akan membuka portal untuk menekan tombol.
 * Tanpa jalur ini, penawaran yang sudah disepakati akan tertahan selamanya
 * menunggu klik yang tidak pernah datang.
 *
 * Bedanya dengan `/confirm`: di sini yang menekan adalah staf, bukan customer.
 * Karena itu tercatat sebagai konfirmasi tangan kedua (`confirmedOffline`),
 * lengkap dengan saluran dan bukti yang wajib diisi, sehingga siapa pun yang
 * membaca dokumen ini nanti tahu persetujuannya tidak berasal dari portal.
 */

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  PHONE: "Telepon",
  MEETING: "Rapat / tatap muka",
  SIGNED_DOCUMENT: "Dokumen bertanda tangan",
  OTHER: "Lainnya",
};

const bodySchema = z.object({
  channel: z.enum([
    "EMAIL",
    "WHATSAPP",
    "PHONE",
    "MEETING",
    "SIGNED_DOCUMENT",
    "OTHER",
  ]),
  /**
   * Bukti yang bisa ditelusuri: nama pemberi ACC, tanggal, nomor referensi.
   * Sengaja wajib — tanpa ini, penandaan ini hanya klaim tanpa jejak.
   */
  note: z
    .string()
    .trim()
    .min(10, "Tulis bukti persetujuannya minimal 10 karakter, misalnya nama pemberi ACC dan tanggalnya")
    .max(1000),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canUpdate" },
    { menuKey: "quotation.verify", action: "canValidate" },
  ]);

  if (!permission.allowed) return permission.response;

  // Customer tidak memakai jalur ini; mereka punya tombol ACC sendiri.
  if (permission.session?.roleCode === "CUSTOMER_ENGAGEMENT") {
    return NextResponse.json(
      {
        message:
          "Gunakan tombol ACC Quotation untuk menyetujui penawaran Anda sendiri.",
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({ where: { id } });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (quotation.status !== "REQUESTED" && quotation.status !== "NEGOTIATION") {
    return NextResponse.json(
      {
        message: `Quotation berstatus ${quotation.status} tidak menunggu persetujuan customer.`,
      },
      { status: 400 }
    );
  }

  const channelLabel = CHANNEL_LABELS[parsed.data.channel];

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.quotation.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: permission.session?.userId,
        confirmedOffline: true,
        offlineConfirmationChannel: parsed.data.channel,
        offlineConfirmationNote: parsed.data.note,
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        // Aksi dibedakan dari CUSTOMER_CONFIRM_QUOTATION agar laporan tidak
        // mencampur ACC portal dengan ACC yang dicatatkan staf.
        action: "STAFF_RECORD_OFFLINE_CONFIRMATION",
        note: `ACC customer di luar sistem untuk ${quotation.quotationNo} via ${channelLabel}: ${parsed.data.note}`,
      },
    });

    await captureQuotationRevision(tx, {
      entityId: id,
      action: "STATUS_TRANSITION",
      session: permission.session!,
      request,
      reason: parsed.data.note,
      changeSummary: `ACC customer dicatat staf (${channelLabel}), bukan lewat portal`,
    });

    return result;
  });

  return NextResponse.json({
    message: `Penawaran ditandai sudah di-ACC customer via ${channelLabel}. Tercatat atas nama Anda.`,
    quotation: updated,
  });
}
