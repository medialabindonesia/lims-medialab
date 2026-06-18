import fs from "fs";
import path from "path";
import LtrPdf from "@/lib/exports/pdf/LtrPdf";
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

export async function renderLtrPdfBuffer(ltr: any): Promise<Buffer> {
  const logoSrc = getLogoDataUri();

  return renderPdfToBuffer(<LtrPdf ltr={ltr} logoSrc={logoSrc} />);
}