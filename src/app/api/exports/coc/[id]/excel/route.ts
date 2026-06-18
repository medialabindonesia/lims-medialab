import { getAuthorizedCocForExport } from "@/lib/exports/technical-data";
import { buildCocExcel } from "@/lib/exports/excel/coc-excel";
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

  const { coc, response } = await getAuthorizedCocForExport(id);

  if (response) return response;

  const buffer = await buildCocExcel(coc);

  const filename = `${safeFileName(coc!.cocNo)}-coc.xlsx`;

  return downloadResponse({
    buffer,
    filename,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}