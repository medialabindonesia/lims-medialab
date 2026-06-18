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
        coc: true,
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

  return JSON.parse(
    JSON.stringify({
      customers,
      parameters,
      coaTemplates,
      quotations,
    })
  );
}