import fs from "fs";
import path from "path";
import { pdf } from "@react-pdf/renderer";
import CocPdf from "@/lib/exports/pdf/CocPdf";
import StpsPdf from "@/lib/exports/pdf/StpsPdf";

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

export async function renderCocPdfBuffer(coc: any) {
  const logoSrc = getLogoDataUri();

  const buffer = await pdf(<CocPdf coc={coc} logoSrc={logoSrc} />).toBuffer();

  return buffer;
}

export async function renderStpsPdfBuffer(stps: any) {
  const logoSrc = getLogoDataUri();

  const buffer = await pdf(<StpsPdf stps={stps} logoSrc={logoSrc} />).toBuffer();

  return buffer;
}