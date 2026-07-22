import { NextResponse } from "next/server";
import { getAuthorizedSampleForResultExport } from "@/lib/exports/lab-data";
import { renderLabResultPdfBuffer } from "@/lib/exports/pdf/render-lab-pdf";
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

  const { sample, response } = await getAuthorizedSampleForResultExport(id);

  if (response) return response;

  const buffer = await renderLabResultPdfBuffer(sample);

  if (isPreviewMode(request)) {
    return NextResponse.json(pdfPreviewPayload(buffer));
  }

  const filename = `${safeFileName(sample!.sampleNo)}-lab-result.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
  });
}