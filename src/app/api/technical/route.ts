import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

export async function GET() {
  const permission = await requireApiPermission("technical.coc", "canView");
  if (!permission.allowed) return permission.response;

  const quotations = await prisma.quotation.findMany({
    where: {
      status: {
        in: ["APPROVED", "PO_UPLOADED", "LTR_CREATED", "COC_CREATED"],
      },
    },
    include: {
      customer: true,
      coaTemplate: true,
      items: {
        include: {
          parameter: true,
        },
      },
      ltr: true,
      ltrs: { include: { items: true }, orderBy: { sequence: "asc" } },
      coc: {
        include: {
          sample: true,
        },
      },
      cocs: {
        include: { sample: true, ltr: true, items: true },
        orderBy: { sequence: "asc" },
      },
      stps: true,
      samples: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ quotations });
}
