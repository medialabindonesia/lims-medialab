import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

export async function getAuthorizedQuotationForExport(quotationId: string) {
  const permission = await requireAnyApiPermission([
    { menuKey: "quotation.request", action: "canView" },
    { menuKey: "quotation.verify", action: "canView" },
    { menuKey: "quotation.revise", action: "canView" },
    { menuKey: "quotation.approve", action: "canView" },
    { menuKey: "sales.ltr", action: "canView" },
    { menuKey: "technical.coc", action: "canView" },
    { menuKey: "technical.stps", action: "canView" },
    { menuKey: "finance.create_invoice", action: "canView" },
    { menuKey: "finance.approve_invoice", action: "canView" },
  ]);

  if (!permission.allowed) {
    return {
      quotation: null,
      response: permission.response,
    };
  }

  const quotation = await prisma.quotation.findUnique({
    where: {
      id: quotationId,
    },
    include: {
      customer: true,
      coaTemplate: true,
      items: {
        orderBy: [{ sort: "asc" }, { id: "asc" }],
        include: {
          parameter: true,
          duration: true,
          regulationParameter: true,
        },
      },
      groups: {
        include: {
          matrix: true,
          regulation: true,
          regulationLinks: {
            include: { regulation: true },
            orderBy: { sort: "asc" },
          },
          locations: { orderBy: { sort: "asc" } },
          items: {
            orderBy: [{ sort: "asc" }, { id: "asc" }],
            include: {
              parameter: true,
              duration: true,
              regulationParameter: true,
            },
          },
        },
        orderBy: { sort: "asc" },
      },
      chargeItems: { orderBy: [{ category: "asc" }, { sort: "asc" }] },
      purchaseOrder: true,
      ltr: true,
      coc: {
        include: {
          sample: true,
        },
      },
      stps: true,
      invoice: true,
      samples: {
        include: {
          coa: true,
          coaTemplate: true,
        },
      },
    },
  });

  if (!quotation) {
    return {
      quotation: null,
      response: NextResponse.json(
        { message: "Quotation tidak ditemukan" },
        { status: 404 }
      ),
    };
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    quotation.customerId !== permission.session.customerId
  ) {
    return {
      quotation: null,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  const actorIds = [quotation.requestedById, quotation.approvedById].filter(
    (value): value is string => Boolean(value)
  );
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));

  return {
    quotation: {
      ...quotation,
      requestedBy: quotation.requestedById
        ? actorById.get(quotation.requestedById) || null
        : null,
      approvedBy: quotation.approvedById
        ? actorById.get(quotation.approvedById) || null
        : null,
    },
    response: null,
  };
}
