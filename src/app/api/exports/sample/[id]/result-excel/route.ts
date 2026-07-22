import { NextResponse } from "next/server";
import { getAuthorizedSampleForResultExport } from "@/lib/exports/lab-data";
import { buildLabResultExcel } from "@/lib/exports/excel/lab-result-excel";
import { safeFileName } from "@/lib/exports/format";
import { downloadResponse, isPreviewMode } from "@/lib/exports/download-response";
import { bufferToPreviewModel } from "@/lib/exports/excel-preview";

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

  const buffer = await buildLabResultExcel(sample);

  if (isPreviewMode(request)) {
    return NextResponse.json(await bufferToPreviewModel(buffer));
  }

  const filename = `${safeFileName(sample!.sampleNo)}-lab-result.xlsx`;

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}