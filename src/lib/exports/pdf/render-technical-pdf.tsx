import fs from "fs";
import path from "path";
import CocPdf from "@/lib/exports/pdf/CocPdf";
import StpsPdf from "@/lib/exports/pdf/StpsPdf";
import { renderPdfToBuffer } from "@/lib/exports/pdf/render-utils";

function getLogoDataUri() {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "logo-medialab.png"
  );

  if (!fs.existsSync(logoPath)) {
    return null;
  }

  const base64 = fs.readFileSync(logoPath).toString("base64");
  return `data:image/png;base64,${base64}`;
}

export async function renderCocPdfBuffer(coc: any): Promise<Buffer> {
  const logoSrc = getLogoDataUri();

  return renderPdfToBuffer(<CocPdf coc={coc} logoSrc={logoSrc} />);
}

export async function renderStpsPdfBuffer(stps: any): Promise<Buffer> {
  const logoSrc = getLogoDataUri();

  return renderPdfToBuffer(<StpsPdf stps={stps} logoSrc={logoSrc} />);
}