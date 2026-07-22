import { NextResponse } from "next/server";
import { getAuthorizedStpsForExport } from "@/lib/exports/technical-data";
import { renderStpsPdfBuffer } from "@/lib/exports/pdf/render-technical-pdf";
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

  const { stps, response } = await getAuthorizedStpsForExport(id);

  if (response) return response;

  const buffer = await renderStpsPdfBuffer(stps);

  if (isPreviewMode(request)) {
    return NextResponse.json(pdfPreviewPayload(buffer));
  }

  const filename = `${safeFileName(stps!.stpsNo)}-stps.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
  });
}