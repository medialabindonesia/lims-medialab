import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getCoaPageData() {
  const session = await getSession();

  const where =
    session?.roleCode === "CUSTOMER_ENGAGEMENT" && session.customerId
      ? {
          customerId: session.customerId,
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

  return JSON.parse(
    JSON.stringify({
      samples,
    })
  );
}