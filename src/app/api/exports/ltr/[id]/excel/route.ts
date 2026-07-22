import { NextResponse } from "next/server";
import { getAuthorizedLtrForExport } from "@/lib/exports/ltr-data";
import { buildLtrExcel } from "@/lib/exports/excel/ltr-excel";
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

  const { ltr, response } = await getAuthorizedLtrForExport(id);

  if (response) return response;

  const buffer = await buildLtrExcel(ltr);

  if (isPreviewMode(request)) {
    return NextResponse.json(await bufferToPreviewModel(buffer));
  }

  const filename = `${safeFileName(ltr!.ltrNo)}-ltr.xlsx`;

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}