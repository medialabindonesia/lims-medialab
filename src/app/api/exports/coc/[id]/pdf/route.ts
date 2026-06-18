import { NextResponse } from "next/server";
import { getAuthorizedCocForExport } from "@/lib/exports/technical-data";
import { renderCocPdfBuffer } from "@/lib/exports/pdf/render-technical-pdf";
import { safeFileName } from "@/lib/exports/format";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { coc, response } = await getAuthorizedCocForExport(id);

  if (response) return response;

  const buffer = await renderCocPdfBuffer(coc);

  const filename = `${safeFileName(coc!.cocNo)}-coc.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}