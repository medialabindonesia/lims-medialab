import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";

export async function GET() {
  const permission = await requireApiPermission("technical.coc", "canView");
  if (!permission.allowed) return permission.response;

  const quotations = await prisma.quotation.findMany({
    where: {
      status: {
        in: ["LTR_CREATED", "COC_CREATED"],
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
      coc: {
        include: {
          sample: true,
        },
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