import { NextResponse } from "next/server";
import { getAuthorizedInvoiceForExport } from "@/lib/exports/invoice-data";
import { renderInvoicePdfBuffer } from "@/lib/exports/pdf/render-invoice-pdf";
import { safeFileName } from "@/lib/exports/format";
import {
  downloadResponse,
  isPreviewMode,
  pdfPreviewPayload,
} from "@/lib/exports/download-response";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { invoice, response } = await getAuthorizedInvoiceForExport(id);

  if (response) return response;

  const buffer = await renderInvoicePdfBuffer(invoice);

  if (isPreviewMode(request)) {
    return NextResponse.json(pdfPreviewPayload(buffer));
  }

  const filename = `${safeFileName(invoice!.invoiceNo)}-invoice.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
  });
}