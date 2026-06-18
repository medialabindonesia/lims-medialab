import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  requireAnyApiPermission,
  requireApiPermission,
} from "@/lib/api-permission";
import { generateDocumentNo } from "@/lib/document-number";

const createInvoiceSchema = z.object({
  quotationId: z.string().min(1, "Quotation wajib dipilih"),
  amount: z.coerce.number().min(0, "Amount tidak valid").optional(),
});

function getInvoiceAmount(quotation: {
  grandTotal?: number | null;
  totalAmount?: number | null;
}) {
  return quotation.grandTotal && quotation.grandTotal > 0
    ? quotation.grandTotal
    : quotation.totalAmount || 0;
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.roleCode === "CUSTOMER_ENGAGEMENT") {
    if (!session.customerId) {
      return NextResponse.json(
        { message: "Customer account belum terhubung ke master customer" },
        { status: 403 }
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

    return NextResponse.json({
      invoices,
      readyQuotations: [],
    });
  }

  const permission = await requireAnyApiPermission([
    { menuKey: "finance.create_invoice", action: "canView" },
    { menuKey: "finance.approve_invoice", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

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

  return NextResponse.json({
    invoices,
    readyQuotations,
  });
}

export async function POST(request: Request) {
  const permission = await requireApiPermission(
    "finance.create_invoice",
    "canCreate"
  );

  if (!permission.allowed) return permission.response;

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.findUnique({
    where: {
      id: parsed.data.quotationId,
    },
    include: {
      customer: true,
      invoice: true,
      items: {
        include: {
          parameter: true,
        },
      },
      samples: {
        include: {
          coa: true,
        },
      },
    },
  });

  if (!quotation) {
    return NextResponse.json(
      { message: "Quotation tidak ditemukan" },
      { status: 404 }
    );
  }

  if (quotation.invoice) {
    return NextResponse.json(
      { message: "Invoice untuk quotation ini sudah dibuat" },
      { status: 400 }
    );
  }

  const hasFinalCoa = quotation.samples.some(
    (sample) => sample.status === "FINAL_COA"
  );

  if (!hasFinalCoa) {
    return NextResponse.json(
      { message: "Invoice hanya bisa dibuat setelah Final COA" },
      { status: 400 }
    );
  }

  const amount = parsed.data.amount ?? getInvoiceAmount(quotation);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo: generateDocumentNo("INV"),
      quotationId: quotation.id,
      amount,
      status: "WAITING_APPROVAL",
      createdById: permission.session?.userId,
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
          },
        },
      },
    },
  });

  await prisma.workflowLog.create({
    data: {
      actorId: permission.session?.userId,
      action: "CREATE_INVOICE",
      note: `Invoice ${invoice.invoiceNo} created for quotation ${quotation.quotationNo}`,
    },
  });

  return NextResponse.json({
    message: "Invoice berhasil dibuat dan menunggu approval",
    invoice,
  });
}