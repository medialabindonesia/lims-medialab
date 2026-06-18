import { NextResponse } from "next/server";
import { getAuthorizedQuotationForExport } from "@/lib/exports/quotation-data";
import { buildQuotationExcel } from "@/lib/exports/excel/quotation-excel";
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

  const buffer = await buildQuotationExcel(quotation);

  const filename = `${safeFileName(quotation!.quotationNo)}-quotation.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}