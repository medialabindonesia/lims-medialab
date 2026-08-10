import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

/**
 * Hanya membuat draft Final COA (status DRAFT, createdById saja). Approval
 * sengaja dipisah ke endpoint lain (final/approve) supaya orang yang approve
 * tidak boleh sama dengan yang create — lihat final/approve/route.ts.
 */
export async function POST(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission("coa.final", "canCreate");

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;

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

  const preliminary = sample.coa.find((item) => item.type === "PRELIMINARY");

  if (!preliminary) {
    return NextResponse.json(
      { message: "Preliminary COA belum dibuat" },
      { status: 400 }
    );
  }

  if (preliminary.status !== "CUSTOMER_CONFIRMED") {
    return NextResponse.json(
      { message: "Final COA hanya bisa dibuat setelah customer confirm preliminary COA" },
      { status: 400 }
    );
  }

  const allValidated = sample.parameters.every(
    (item) => item.status === "VALIDATED"
  );

  if (!allValidated) {
    return NextResponse.json(
      { message: "Semua parameter harus VALIDATED dulu" },
      { status: 400 }
    );
  }

  const existingFinal = sample.coa.find((item) => item.type === "FINAL");

  if (existingFinal) {
    return NextResponse.json(
      {
        message:
          existingFinal.status === "APPROVED"
            ? "Final COA sudah disetujui"
            : "Final COA sudah dibuat, menunggu approval Lab Manager",
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const finalCoa = await tx.coa.create({
      data: {
        coaNo: generateDocumentNo("FINAL-COA"),
        sampleId: sample.id,
        type: "FINAL",
        status: "DRAFT",
        createdById: permission.session?.userId,
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "CREATE_FINAL_COA",
        note: `Final COA ${finalCoa.coaNo} dibuat, menunggu approval`,
      },
    });

    return { finalCoa };
  });

  return NextResponse.json({
    message: "Final COA berhasil dibuat, menunggu approval Lab Manager",
    ...result,
  });
}
