import { getAuthorizedQuotationForExport } from "@/lib/exports/quotation-data";
import { renderQuotationPdfBuffer } from "@/lib/exports/pdf/render-quotation-pdf";
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

  const { quotation, response } = await getAuthorizedQuotationForExport(id);

  if (response) return response;

  const buffer = await renderQuotationPdfBuffer(quotation);

  const filename = `${safeFileName(quotation!.quotationNo)}-quotation.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
    disposition: isPreviewMode(request) ? "inline" : "attachment",
  });
}