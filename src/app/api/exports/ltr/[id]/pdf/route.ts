import { getAuthorizedLtrForExport } from "@/lib/exports/ltr-data";
import { renderLtrPdfBuffer } from "@/lib/exports/pdf/render-ltr-pdf";
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

  const { ltr, response } = await getAuthorizedLtrForExport(id);

  if (response) return response;

  const buffer = await renderLtrPdfBuffer(ltr);

  const filename = `${safeFileName(ltr!.ltrNo)}-ltr.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
    disposition: isPreviewMode(request) ? "inline" : "attachment",
  });
}