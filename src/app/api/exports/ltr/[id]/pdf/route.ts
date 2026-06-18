import { NextResponse } from "next/server";
import { getAuthorizedLtrForExport } from "@/lib/exports/ltr-data";
import { renderLtrPdfBuffer } from "@/lib/exports/pdf/render-ltr-pdf";
import { safeFileName } from "@/lib/exports/format";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { ltr, response } = await getAuthorizedLtrForExport(id);

  if (response) return response;

  const buffer = await renderLtrPdfBuffer(ltr);

  const filename = `${safeFileName(ltr!.ltrNo)}-ltr.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}