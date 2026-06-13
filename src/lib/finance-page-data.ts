import { prisma } from "@/lib/db";

export async function getFinancePageData() {
  const [invoices, readyQuotations] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        quotation: {
          include: {
            customer: true,
            coaTemplate: true,
            samples: {
              include: {
                coa: true,
                coaTemplate: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.quotation.findMany({
      where: {
        invoice: {
          is: null,
        },
        samples: {
          some: {
            status: "FINAL_COA",
          },
        },
      },
      include: {
        customer: true,
        coaTemplate: true,
        samples: {
          where: {
            status: "FINAL_COA",
          },
          include: {
            coa: true,
            coaTemplate: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  return JSON.parse(
    JSON.stringify({
      invoices,
      readyQuotations,
    })
  );
}