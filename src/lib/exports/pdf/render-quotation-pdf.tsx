import fs from "fs";
import path from "path";
import { pdf } from "@react-pdf/renderer";
import QuotationPdf from "@/lib/exports/pdf/QuotationPdf";

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

export async function renderQuotationPdfBuffer(quotation: any) {
  const logoSrc = getLogoDataUri();

  const buffer = await pdf(
    <QuotationPdf quotation={quotation} logoSrc={logoSrc} />
  ).toBuffer();

  return buffer;
}