import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getLabAnalysisPageData() {
  const session = await getSession();

  const where =
    session?.roleCode === "LAB_ANALYST"
      ? {
          analystId: session.userId,
        }
      : undefined;

  const [sampleParameters, analysts] = await Promise.all([
    prisma.sampleParameter.findMany({
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
    }),

    prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          code: "LAB_ANALYST",
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return JSON.parse(
    JSON.stringify({
      sampleParameters,
      analysts,
    })
  );
}