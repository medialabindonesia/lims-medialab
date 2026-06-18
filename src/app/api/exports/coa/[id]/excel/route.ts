import { getAuthorizedCoaForExport } from "@/lib/exports/lab-data";
import { buildCoaExcel } from "@/lib/exports/excel/coa-excel";
import { safeFileName } from "@/lib/exports/format";
import { downloadResponse } from "@/lib/exports/download-response";

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

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}