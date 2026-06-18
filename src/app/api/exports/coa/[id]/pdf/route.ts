import { getAuthorizedCoaForExport } from "@/lib/exports/lab-data";
import { renderCoaPdfBuffer } from "@/lib/exports/pdf/render-lab-pdf";
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

  const buffer = await renderCoaPdfBuffer(coa);

  const filename = `${safeFileName(coa!.coaNo)}-${coa!.type.toLowerCase()}-coa.pdf`;

  return downloadResponse({
    buffer,
    filename,
    contentType: "application/pdf",
  });
}