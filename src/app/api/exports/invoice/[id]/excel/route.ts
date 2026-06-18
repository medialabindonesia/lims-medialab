import { NextResponse } from "next/server";
import { getAuthorizedInvoiceForExport } from "@/lib/exports/invoice-data";
import { buildInvoiceExcel } from "@/lib/exports/excel/invoice-excel";
import { safeFileName } from "@/lib/exports/format";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { invoice, response } = await getAuthorizedInvoiceForExport(id);

  if (response) return response;

  const buffer = await buildInvoiceExcel(invoice);

  const filename = `${safeFileName(invoice!.invoiceNo)}-invoice.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}