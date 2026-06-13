import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

export async function GET() {
  const permission = await requireAnyApiPermission([
    { menuKey: "lab.conduct_analysis", action: "canView" },
    { menuKey: "lab.enter_results", action: "canView" },
    { menuKey: "lab.review_results", action: "canView" },
    { menuKey: "lab.verify_results", action: "canView" },
    { menuKey: "lab.validate_results", action: "canView" },
    { menuKey: "lab.ask_retest", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const where =
    permission.session?.roleCode === "LAB_ANALYST"
      ? {
          analystId: permission.session.userId,
        }
      : undefined;

  const sampleParameters = await prisma.sampleParameter.findMany({
    where,
    include: {
      parameter: true,
      templateParameter: true,
      sample: {
        include: {
          customer: true,
          quotation: true,
          coaTemplate: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ sampleParameters });
}