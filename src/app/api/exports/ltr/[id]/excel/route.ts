import { NextResponse } from "next/server";
import { getAuthorizedLtrForExport } from "@/lib/exports/ltr-data";
import { buildLtrExcel } from "@/lib/exports/excel/ltr-excel";
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

  const buffer = await buildLtrExcel(ltr);

  const filename = `${safeFileName(ltr!.ltrNo)}-ltr.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}