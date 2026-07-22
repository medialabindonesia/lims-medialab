import { getAuthorizedCocForExport } from "@/lib/exports/technical-data";
import { renderCocPdfBuffer } from "@/lib/exports/pdf/render-technical-pdf";
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

  const { coc, response } = await getAuthorizedCocForExport(id);

  if (response) return response;

  const buffer = await renderCocPdfBuffer(coc);

  const filename = `${safeFileName(coc!.cocNo)}-coc.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
    disposition: isPreviewMode(request) ? "inline" : "attachment",
  });
}