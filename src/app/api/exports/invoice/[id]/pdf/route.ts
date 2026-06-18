import { NextResponse } from "next/server";
import { getAuthorizedInvoiceForExport } from "@/lib/exports/invoice-data";
import { renderInvoicePdfBuffer } from "@/lib/exports/pdf/render-invoice-pdf";
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

  const buffer = await renderInvoicePdfBuffer(invoice);

  const filename = `${safeFileName(invoice!.invoiceNo)}-invoice.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}