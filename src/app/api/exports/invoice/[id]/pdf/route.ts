import { getAuthorizedInvoiceForExport } from "@/lib/exports/invoice-data";
import { renderInvoicePdfBuffer } from "@/lib/exports/pdf/render-invoice-pdf";
import { safeFileName } from "@/lib/exports/format";
import { downloadResponse, isPreviewMode } from "@/lib/exports/download-response";

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

  const filename = `${safeFileName(invoice!.invoiceNo)}-invoice.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
    disposition: isPreviewMode(request) ? "inline" : "attachment",
  });
}