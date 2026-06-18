import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";

const exportPermissions = [
  { menuKey: "lab.receive_sample", action: "canView" as const },
  { menuKey: "lab.distribute_parameter", action: "canView" as const },
  { menuKey: "lab.conduct_analysis", action: "canView" as const },
  { menuKey: "lab.enter_results", action: "canView" as const },
  { menuKey: "lab.review_results", action: "canView" as const },
  { menuKey: "lab.verify_results", action: "canView" as const },
  { menuKey: "lab.validate_results", action: "canView" as const },
  { menuKey: "coa.preliminary", action: "canView" as const },
  { menuKey: "coa.final", action: "canView" as const },
  { menuKey: "customer.invoices", action: "canView" as const },
  { menuKey: "admin.rbac", action: "canView" as const },
];

export async function getAuthorizedSampleForResultExport(sampleId: string) {
  const permission = await requireAnyApiPermission(exportPermissions);

  if (!permission.allowed) {
    return {
      sample: null,
      response: permission.response,
    };
  }

  const sample = await prisma.sample.findUnique({
    where: {
      id: sampleId,
    },
    include: {
      customer: true,
      coaTemplate: true,
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
          coc: true,
          stps: true,
          invoice: true,
        },
      },
      parameters: {
        include: {
          parameter: true,
          templateParameter: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      coa: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!sample) {
    return {
      sample: null,
      response: NextResponse.json(
        { message: "Sample tidak ditemukan" },
        { status: 404 }
      ),
    };
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    sample.customerId !== permission.session.customerId
  ) {
    return {
      sample: null,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    sample,
    response: null,
  };
}

export async function getAuthorizedCoaForExport(coaId: string) {
  const permission = await requireAnyApiPermission(exportPermissions);

  if (!permission.allowed) {
    return {
      coa: null,
      response: permission.response,
    };
  }

  const coa = await prisma.coa.findUnique({
    where: {
      id: coaId,
    },
    include: {
      sample: {
        include: {
          customer: true,
          coaTemplate: true,
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
              coc: true,
              stps: true,
              invoice: true,
            },
          },
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
    },
  });

  if (!coa) {
    return {
      coa: null,
      response: NextResponse.json(
        { message: "COA tidak ditemukan" },
        { status: 404 }
      ),
    };
  }

  if (
    permission.session?.roleCode === "CUSTOMER_ENGAGEMENT" &&
    permission.session.customerId &&
    coa.sample.customerId !== permission.session.customerId
  ) {
    return {
      coa: null,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    coa,
    response: null,
  };
}