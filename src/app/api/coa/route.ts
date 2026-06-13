import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

export async function GET() {
  const permission = await requireAnyApiPermission([
    { menuKey: "coa.preliminary", action: "canView" },
    { menuKey: "coa.final", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const where =
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId
      ? {
          customerId: permission.session.customerId,
        }
      : undefined;

  const samples = await prisma.sample.findMany({
    where,
    include: {
      customer: true,
      quotation: true,
      coaTemplate: true,
      parameters: {
        include: {
          parameter: true,
          templateParameter: true,
        },
        orderBy: {
          templateParameter: {
            sort: "asc",
          },
        },
      },
      coa: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ samples });
}