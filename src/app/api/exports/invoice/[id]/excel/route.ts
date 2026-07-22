import { NextResponse } from "next/server";
import { getAuthorizedInvoiceForExport } from "@/lib/exports/invoice-data";
import { buildInvoiceExcel } from "@/lib/exports/excel/invoice-excel";
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

  const { invoice, response } = await getAuthorizedInvoiceForExport(id);

  if (response) return response;

  const buffer = await buildInvoiceExcel(invoice);

  if (isPreviewMode(request)) {
    return NextResponse.json(await bufferToPreviewModel(buffer));
  }

  const filename = `${safeFileName(invoice!.invoiceNo)}-invoice.xlsx`;

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}