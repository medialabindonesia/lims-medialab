import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    { menuKey: "coa.preliminary", action: "canCreate" },
    { menuKey: "coa.preliminary", action: "canUpdate" },
  ]);

  if (!permission.allowed) return permission.response;

  const { sampleId } = await context.params;

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      parameters: true,
      coa: true,
    },
  });

  if (!sample) {
    return NextResponse.json(
      { message: "Sample tidak ditemukan" },
      { status: 404 }
    );
  }

  if (sample.status !== "VALIDATED" && sample.status !== "PRELIMINARY_COA") {
    return NextResponse.json(
      { message: "Preliminary COA hanya bisa dibuat setelah sample VALIDATED" },
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

  const existing = sample.coa.find((item) => item.type === "PRELIMINARY");

  const result = await prisma.$transaction(async (tx) => {
    const preliminary = existing
      ? await tx.coa.update({
          where: { id: existing.id },
          data: {
            status: "SENT_TO_CUSTOMER",
            createdById: permission.session?.userId,
          },
        })
      : await tx.coa.create({
          data: {
            coaNo: generateDocumentNo("PRE-COA"),
            sampleId: sample.id,
            type: "PRELIMINARY",
            status: "SENT_TO_CUSTOMER",
            createdById: permission.session?.userId,
          },
        });

    const updatedSample = await tx.sample.update({
      where: { id: sample.id },
      data: {
        status: "PRELIMINARY_COA",
      },
    });

    await tx.workflowLog.create({
      data: {
        actorId: permission.session?.userId,
        sampleId: sample.id,
        action: "CREATE_PRELIMINARY_COA",
        note: `Preliminary COA ${preliminary.coaNo} created`,
      },
    });

    return { preliminary, sample: updatedSample };
  });

  return NextResponse.json({
    message: "Preliminary COA berhasil dibuat dan dikirim ke customer",
    ...result,
  });
}