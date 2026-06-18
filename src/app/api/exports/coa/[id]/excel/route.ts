import { NextResponse } from "next/server";
import { getAuthorizedCoaForExport } from "@/lib/exports/lab-data";
import { buildCoaExcel } from "@/lib/exports/excel/coa-excel";
import { safeFileName } from "@/lib/exports/format";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const { coa, response } = await getAuthorizedCoaForExport(id);

  if (response) return response;

  const buffer = await buildCoaExcel(coa);

  const filename = `${safeFileName(coa!.coaNo)}-${coa!.type.toLowerCase()}-coa.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}