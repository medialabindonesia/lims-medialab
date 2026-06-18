import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

const nullableString = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().optional().nullable()
);

const nullableDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().optional().nullable()
);

const stpsSchema = z.object({
  technicalManagerName: nullableString,
  technicalManagerPosition: nullableString,
  issuedDate: nullableDate,

  sampler1Name: nullableString,
  sampler1Position: nullableString,
  sampler2Name: nullableString,
  sampler2Position: nullableString,
  sampler3Name: nullableString,
  sampler3Position: nullableString,
  sampler4Name: nullableString,
  sampler4Position: nullableString,
});

type RouteContext = {
  params: Promise<{
    quotationId: string;
  }>;
};

function toDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export async function POST(request: Request, context: RouteContext) {
  const permission = await requireApiPermission("technical.stps", "canCreate");
  if (!permission.allowed) return permission.response;

  const { quotationId } = await context.params;
  const body = await request.json();
  const parsed = stpsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: {
      id: quotationId,
    },
    include: {
      customer: true,
      coc: true,
      stps: true,
      samples: true,
    },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (!quotation.coc) {
    return NextResponse.json(
      { message: "STPS hanya bisa dibuat setelah COC dibuat" },
      { status: 400 }
    );
  }

  if (quotation.status !== "COC_CREATED") {
    return NextResponse.json(
      { message: "Status quotation belum siap dibuat STPS" },
      { status: 400 }
    );
  }

  const existingStps = quotation.stps[0];

  const stps = existingStps
    ? await prisma.stps.update({
        where: {
          id: existingStps.id,
        },
        data: {
          cocId: quotation.coc.id,
          status: "ISSUED",
          technicalManagerName: parsed.data.technicalManagerName || null,
          technicalManagerPosition:
            parsed.data.technicalManagerPosition || null,
          issuedDate: toDate(parsed.data.issuedDate) || new Date(),
          sampler1Name: parsed.data.sampler1Name || null,
          sampler1Position: parsed.data.sampler1Position || null,
          sampler2Name: parsed.data.sampler2Name || null,
          sampler2Position: parsed.data.sampler2Position || null,
          sampler3Name: parsed.data.sampler3Name || null,
          sampler3Position: parsed.data.sampler3Position || null,
          sampler4Name: parsed.data.sampler4Name || null,
          sampler4Position: parsed.data.sampler4Position || null,
          createdById: permission.session?.userId,
        },
      })
    : await prisma.stps.create({
        data: {
          stpsNo: generateDocumentNo("STPS"),
          quotationId: quotation.id,
          cocId: quotation.coc.id,
          status: "ISSUED",
          technicalManagerName: parsed.data.technicalManagerName || null,
          technicalManagerPosition:
            parsed.data.technicalManagerPosition || null,
          issuedDate: toDate(parsed.data.issuedDate) || new Date(),
          sampler1Name: parsed.data.sampler1Name || null,
          sampler1Position: parsed.data.sampler1Position || null,
          sampler2Name: parsed.data.sampler2Name || null,
          sampler2Position: parsed.data.sampler2Position || null,
          sampler3Name: parsed.data.sampler3Name || null,
          sampler3Position: parsed.data.sampler3Position || null,
          sampler4Name: parsed.data.sampler4Name || null,
          sampler4Position: parsed.data.sampler4Position || null,
          createdById: permission.session?.userId,
        },
      });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      sampleId: quotation.samples[0]?.id || null,
      action: existingStps ? "UPDATE_STPS" : "CREATE_STPS",
      note: `STPS ${stps.stpsNo} saved for quotation ${quotation.quotationNo}`,
    },
  });

  return NextResponse.json({
    message: existingStps ? "STPS berhasil diupdate" : "STPS berhasil dibuat",
    stps,
  });
}