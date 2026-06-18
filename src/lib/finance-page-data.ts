import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getFinancePageData() {
  const [invoices, readyQuotations] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        quotation: {
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
            coc: {
              include: {
                sample: true,
              },
            },
            stps: true,
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
        items: {
          include: {
            parameter: true,
          },
        },
        purchaseOrder: true,
        ltr: true,
        coc: {
          include: {
            sample: true,
          },
        },
        stps: true,
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

export async function getCustomerInvoicePageData() {
  const session = await getSession();

  if (!session?.customerId) {
    return JSON.parse(
      JSON.stringify({
        invoices: [],
        readyQuotations: [],
      })
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      quotation: {
        customerId: session.customerId,
      },
    },
    include: {
      quotation: {
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
          coc: {
            include: {
              sample: true,
            },
          },
          stps: true,
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
  });

  return JSON.parse(
    JSON.stringify({
      invoices,
      readyQuotations: [],
    })
  );
}