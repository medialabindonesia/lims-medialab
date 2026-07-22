import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

const rejectSchema = z.object({
  reason: z.string().trim().min(1, "Alasan penolakan wajib diisi"),
});

/**
 * Customer menolak / minta revisi Preliminary COA. Sesuai SOP: hasil yang
 * ditolak dikembalikan ke jalur retest (mekanisme yang sama dengan
 * lab.ask_retest) — bukan status baru — supaya pipeline lab yang sudah ada
 * (start → conduct analysis → ... → validate) otomatis menampungnya kembali
 * tanpa perlu UI lab baru.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.roleCode !== "CUSTOMER_ENGAGEMENT") {
    return NextResponse.json(
      { message: "Hanya customer yang dapat menolak Preliminary COA" },
      { status: 403 }
    );
  }

  const { sampleId } = await context.params;
  const body = await request.json();
  const parsed = rejectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      coa: true,
      parameters: true,
    },
  });

  if (!sample) {
    return NextResponse.json(
      { message: "Sample tidak ditemukan" },
      { status: 404 }
    );
  }

  if (sample.customerId !== session.customerId) {
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
      {
        message:
          "Preliminary COA tidak dalam status menunggu konfirmasi customer",
      },
      { status: 400 }
    );
  }

  const eligible = sample.parameters.filter((item) =>
    ["ENTERED", "REVIEWED", "VERIFIED", "VALIDATED"].includes(item.status)
  );

  if (eligible.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada hasil yang bisa diminta revisi" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.sampleParameter.updateMany({
      where: {
        id: { in: eligible.map((item) => item.id) },
      },
      data: {
        status: "RETEST",
        retestReason: parsed.data.reason,
        reviewedById: null,
        verifiedById: null,
        validatedById: null,
      },
    });

    await tx.sample.update({
      where: { id: sample.id },
      data: { status: "RETEST" },
    });

    // Balik Preliminary COA ke DRAFT — rute preliminary yang sudah ada akan
    // meng-update record ini (bukan buat baru) saat lab generate ulang.
    await tx.coa.update({
      where: { id: preliminary.id },
      data: { status: "DRAFT" },
    });

    await tx.workflowLog.create({
      data: {
        actorId: session.userId,
        sampleId: sample.id,
        action: "CUSTOMER_REJECT_PRELIMINARY_COA",
        note: parsed.data.reason,
      },
    });
  });

  return NextResponse.json({
    message: "Permintaan revisi berhasil dikirim ke tim lab",
  });
}
