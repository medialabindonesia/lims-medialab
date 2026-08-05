import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getQuotationPageData() {
  const session = await getSession();

  const quotationWhere =
    session?.roleCode === "CUSTOMER_ENGAGEMENT" && session.customerId
      ? {
          customerId: session.customerId,
        }
      : undefined;

  const customerWhere =
    session?.roleCode === "CUSTOMER_ENGAGEMENT" && session.customerId
      ? {
          id: session.customerId,
          isActive: true,
        }
      : {
          isActive: true,
        };

  const [customers, parameters, coaTemplates, quotations] = await Promise.all([
    prisma.customer.findMany({
      where: customerWhere,
      include: {
        users: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.analysisParameter.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.coaTemplate.findMany({
      where: {
        isActive: true,
      },
      include: {
        parameters: {
          where: {
            isActive: true,
          },
          include: {
            parameter: true,
          },
          orderBy: {
            sort: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.quotation.findMany({
      where: quotationWhere,
      include: {
        customer: true,
        coaTemplate: true,
        items: {
          include: {
            parameter: true,
          },
        },
        purchaseOrder: true,
        ltr: true,
        ltrs: {
          include: { items: true },
          orderBy: { sequence: "asc" },
        },
        coc: true,
        cocs: {
          include: { items: true, ltr: true, sample: true },
          orderBy: { sequence: "asc" },
        },
        stps: true,
        invoice: true,
        samples: {
          include: {
            coa: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const quotationIds = quotations.map((quotation) => quotation.id);
  const revisions = quotationIds.length
    ? await prisma.auditRevision.findMany({
        where: { entityType: "QUOTATION", entityId: { in: quotationIds } },
        select: {
          id: true,
          entityId: true,
          revisionNo: true,
          action: true,
          changeSummary: true,
          reason: true,
          actorNameSnapshot: true,
          createdAt: true,
        },
        orderBy: [{ entityId: "asc" }, { revisionNo: "desc" }],
      })
    : [];
  const creatorIds = [...new Set(quotations.map((item) => item.requestedById).filter(Boolean))] as string[];
  const creators = creatorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const revisionMap = new Map<string, typeof revisions>();
  for (const revision of revisions) {
    revisionMap.set(revision.entityId, [
      ...(revisionMap.get(revision.entityId) || []),
      revision,
    ]);
  }
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));

  return JSON.parse(JSON.stringify({
    customers,
    parameters,
    coaTemplates,
    quotations: quotations.map((quotation) => ({
      ...quotation,
      requestedBy: quotation.requestedById
        ? creatorMap.get(quotation.requestedById) || null
        : null,
      revisions: revisionMap.get(quotation.id) || [],
    })),
  }));
}
