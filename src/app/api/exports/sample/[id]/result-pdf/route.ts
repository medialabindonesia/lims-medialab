import { getAuthorizedSampleForResultExport } from "@/lib/exports/lab-data";
import { renderLabResultPdfBuffer } from "@/lib/exports/pdf/render-lab-pdf";
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

  const { sample, response } = await getAuthorizedSampleForResultExport(id);

  if (response) return response;

  const buffer = await renderLabResultPdfBuffer(sample);

  const filename = `${safeFileName(sample!.sampleNo)}-lab-result.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
    disposition: isPreviewMode(request) ? "inline" : "attachment",
  });
}