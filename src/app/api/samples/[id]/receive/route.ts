import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const permission = await requireApiPermission(
    "lab.receive_sample",
    "canUpdate"
  );

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const sample = await prisma.sample.findUnique({
    where: { id },
  });

  if (!sample) {
    return NextResponse.json(
      { message: "Sample tidak ditemukan" },
      { status: 404 }
    );
  }

  if (sample.status !== "SAMPLE_SENT") {
    return NextResponse.json(
      { message: "Hanya sample SAMPLE_SENT yang bisa diterima lab" },
      { status: 400 }
    );
  }

  const updated = await prisma.sample.update({
    where: { id },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
      receivedById: permission.session?.userId,
    },
    include: {
      customer: true,
      quotation: true,
      parameters: {
        include: {
          parameter: true,
        },
      },
    },
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      sampleId: sample.id,
      action: "RECEIVE_SAMPLE",
      note: `Sample ${sample.sampleNo} received by lab`,
    },
  });

  return NextResponse.json({
    message: "Sample berhasil diterima lab",
    sample: updated,
  });
}