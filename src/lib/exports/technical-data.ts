import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

const exportPermissions = [
  { menuKey: "technical.coc", action: "canView" as const },
  { menuKey: "technical.stps", action: "canView" as const },
  { menuKey: "sales.ltr", action: "canView" as const },
  { menuKey: "lab.receive_sample", action: "canView" as const },
  { menuKey: "admin.rbac", action: "canView" as const },
];

export async function getAuthorizedCocForExport(cocId: string) {
  const permission = await requireAnyApiPermission(exportPermissions);

  if (!permission.allowed) {
    return {
      coc: null,
      response: permission.response,
    };
  }

  const coc = await prisma.coc.findUnique({
    where: {
      id: cocId,
    },
    include: {
      ltr: true,
      items: {
        include: {
          quotationItem: { include: { parameter: true } },
        },
        orderBy: { sort: "asc" },
      },
      sample: {
        include: {
          parameters: {
            include: {
              parameter: true,
              templateParameter: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
      quotation: {
        include: {
          customer: true,
          coaTemplate: true,
          items: {
            include: {
              parameter: true,
            },
            orderBy: {
              id: "asc",
            },
          },
          ltr: true,
          stps: true,
          purchaseOrder: true,
          samples: true,
        },
      },
    },
  });

  if (!coc) {
    return {
      coc: null,
      response: NextResponse.json(
        { message: "COC tidak ditemukan" },
        { status: 404 }
      ),
    };
  }

  const scopedCoc = {
    ...coc,
    quotation: {
      ...coc.quotation,
      ltr: coc.ltr || coc.quotation.ltr,
      items: coc.items.map((item) => item.quotationItem),
    },
  };

  return {
    coc: scopedCoc,
    response: null,
  };
}

export async function getAuthorizedStpsForExport(stpsId: string) {
  const permission = await requireAnyApiPermission(exportPermissions);

  if (!permission.allowed) {
    return {
      stps: null,
      response: permission.response,
    };
  }

  const stps = await prisma.stps.findUnique({
    where: {
      id: stpsId,
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
            orderBy: {
              id: "asc",
            },
          },
          ltr: true,
          coc: {
            include: {
              sample: true,
            },
          },
          purchaseOrder: true,
          samples: true,
        },
      },
    },
  });

  if (!stps) {
    return {
      stps: null,
      response: NextResponse.json(
        { message: "STPS tidak ditemukan" },
        { status: 404 }
      ),
    };
  }

  return {
    stps,
    response: null,
  };
}
