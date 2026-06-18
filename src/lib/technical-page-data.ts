import { prisma } from "@/lib/db";

export async function getTechnicalCocPageData() {
  const quotations = await prisma.quotation.findMany({
    where: {
      status: {
        in: ["LTR_CREATED", "COC_CREATED"],
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
      ltr: true,
      coc: {
        include: {
          sample: true,
        },
      },
      stps: true,
      samples: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return JSON.parse(JSON.stringify({ quotations }));
}

export async function getTechnicalStpsPageData() {
  const quotations = await prisma.quotation.findMany({
    where: {
      status: "COC_CREATED",
    },
    include: {
      customer: true,
      coaTemplate: true,
      items: {
        include: {
          parameter: true,
        },
      },
      ltr: true,
      coc: {
        include: {
          sample: true,
        },
      },
      stps: true,
      samples: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return JSON.parse(JSON.stringify({ quotations }));
}