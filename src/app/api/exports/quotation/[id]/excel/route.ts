import { NextResponse } from "next/server";
import { getAuthorizedQuotationForExport } from "@/lib/exports/quotation-data";
import { buildQuotationExcel } from "@/lib/exports/excel/quotation-excel";
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

  const { quotation, response } = await getAuthorizedQuotationForExport(id);

  if (response) return response;

  const buffer = await buildQuotationExcel(quotation);

  if (isPreviewMode(request)) {
    return NextResponse.json(await bufferToPreviewModel(buffer));
  }

  const filename = `${safeFileName(quotation!.quotationNo)}-quotation.xlsx`;

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}