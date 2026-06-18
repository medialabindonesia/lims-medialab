import { NextResponse } from "next/server";
import { getAuthorizedSampleForResultExport } from "@/lib/exports/lab-data";
import { renderLabResultPdfBuffer } from "@/lib/exports/pdf/render-lab-pdf";
import { safeFileName } from "@/lib/exports/format";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { sample, response } = await getAuthorizedSampleForResultExport(id);

  if (response) return response;

  const buffer = await renderLabResultPdfBuffer(sample);

  const filename = `${safeFileName(sample!.sampleNo)}-lab-result.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}