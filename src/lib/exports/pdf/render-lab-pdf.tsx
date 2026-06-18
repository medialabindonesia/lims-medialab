import fs from "fs";
import path from "path";
import { pdf } from "@react-pdf/renderer";
import LabResultPdf from "@/lib/exports/pdf/LabResultPdf";
import CoaPdf from "@/lib/exports/pdf/CoaPdf";

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

export async function renderLabResultPdfBuffer(sample: any) {
  const logoSrc = getLogoDataUri();

  const buffer = await pdf(
    <LabResultPdf sample={sample} logoSrc={logoSrc} />
  ).toBuffer();

  return buffer;
}

export async function renderCoaPdfBuffer(coa: any) {
  const logoSrc = getLogoDataUri();

  const buffer = await pdf(<CoaPdf coa={coa} logoSrc={logoSrc} />).toBuffer();

  return buffer;
}