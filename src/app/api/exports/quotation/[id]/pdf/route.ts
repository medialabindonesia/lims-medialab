import { NextResponse } from "next/server";
import { getAuthorizedQuotationForExport } from "@/lib/exports/quotation-data";
import { renderQuotationPdfBuffer } from "@/lib/exports/pdf/render-quotation-pdf";
import { safeFileName } from "@/lib/exports/format";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { quotation, response } = await getAuthorizedQuotationForExport(id);

  if (response) return response;

  const buffer = await renderQuotationPdfBuffer(quotation);

  const filename = `${safeFileName(quotation!.quotationNo)}-quotation.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}