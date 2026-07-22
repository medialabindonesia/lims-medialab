import { NextResponse } from "next/server";
import { getAuthorizedCocForExport } from "@/lib/exports/technical-data";
import { buildCocExcel } from "@/lib/exports/excel/coc-excel";
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

  const { coc, response } = await getAuthorizedCocForExport(id);

  if (response) return response;

  const buffer = await buildCocExcel(coc);

  if (isPreviewMode(request)) {
    return NextResponse.json(await bufferToPreviewModel(buffer));
  }

  const filename = `${safeFileName(coc!.cocNo)}-coc.xlsx`;

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}