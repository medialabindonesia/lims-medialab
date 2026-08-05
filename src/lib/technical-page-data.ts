import { prisma } from "@/lib/db";

export async function getTechnicalCocPageData() {
  const quotations = await prisma.quotation.findMany({
    where: {
      status: {
        in: ["APPROVED", "PO_UPLOADED", "LTR_CREATED", "COC_CREATED"],
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
      ltrs: {
        include: {
          items: true,
        },
        orderBy: { sequence: "asc" },
      },
      coc: {
        include: {
          sample: true,
        },
      },
      cocs: {
        include: {
          sample: true,
          ltr: true,
          items: true,
        },
        orderBy: { sequence: "asc" },
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
      ltrs: { orderBy: { sequence: "asc" } },
      coc: {
        include: {
          sample: true,
        },
      },
      cocs: {
        include: { sample: true, ltr: true, items: true },
        orderBy: { sequence: "asc" },
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
