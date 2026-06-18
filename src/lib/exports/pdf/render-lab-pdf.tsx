import fs from "fs";
import path from "path";
import LabResultPdf from "@/lib/exports/pdf/LabResultPdf";
import CoaPdf from "@/lib/exports/pdf/CoaPdf";
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

export async function renderLabResultPdfBuffer(sample: any): Promise<Buffer> {
  const logoSrc = getLogoDataUri();

  return renderPdfToBuffer(
    <LabResultPdf sample={sample} logoSrc={logoSrc} />
  );
}

export async function renderCoaPdfBuffer(coa: any): Promise<Buffer> {
  const logoSrc = getLogoDataUri();

  return renderPdfToBuffer(<CoaPdf coa={coa} logoSrc={logoSrc} />);
}