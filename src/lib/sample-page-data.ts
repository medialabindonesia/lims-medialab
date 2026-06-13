import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getSamplePageData() {
  const session = await getSession();

  const customerFilter =
    session?.roleCode === "CUSTOMER_ENGAGEMENT" && session.customerId
      ? {
          customerId: session.customerId,
        }
      : {};

  const [samples, quotationsReady, analysts] = await Promise.all([
    prisma.sample.findMany({
      where: customerFilter,
      include: {
        customer: true,
        quotation: true,
        coaTemplate: true,
        parameters: {
          include: {
            parameter: true,
            templateParameter: true,
          },
        },
        coc: true,
        coa: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.quotation.findMany({
      where: {
        ...customerFilter,
        status: "COC_CREATED",
        samples: {
          none: {},
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
        coc: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          code: "LAB_ANALYST",
        },
      },
      include: {
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return JSON.parse(
    JSON.stringify({
      samples,
      quotationsReady,
      analysts,
    })
  );
}