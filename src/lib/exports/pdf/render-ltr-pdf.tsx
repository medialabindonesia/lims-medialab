import fs from "fs";
import path from "path";
import { pdf } from "@react-pdf/renderer";
import LtrPdf from "@/lib/exports/pdf/LtrPdf";

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

export async function renderLtrPdfBuffer(ltr: any) {
  const logoSrc = getLogoDataUri();

  const buffer = await pdf(<LtrPdf ltr={ltr} logoSrc={logoSrc} />).toBuffer();

  return buffer;
}