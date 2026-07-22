import { NextResponse } from "next/server";
import { getAuthorizedStpsForExport } from "@/lib/exports/technical-data";
import { buildStpsExcel } from "@/lib/exports/excel/stps-excel";
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

  const { stps, response } = await getAuthorizedStpsForExport(id);

  if (response) return response;

  const buffer = await buildStpsExcel(stps);

  if (isPreviewMode(request)) {
    return NextResponse.json(await bufferToPreviewModel(buffer));
  }

  const filename = `${safeFileName(stps!.stpsNo)}-stps.xlsx`;

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}