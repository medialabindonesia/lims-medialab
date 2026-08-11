function optionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function numericEnv(name: string) {
  const value = optionalEnv(name);
  if (!value) return null;

  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export type QuotationDocumentEnvironmentKey =
  | "QUOTATION_COMPANY_NAME"
  | "QUOTATION_COMPANY_ADDRESS"
  | "QUOTATION_COMPANY_EMAIL"
  | "QUOTATION_BANK_NAME"
  | "QUOTATION_BANK_ACCOUNT_NAME"
  | "QUOTATION_BANK_ACCOUNT_NUMBER"
  | "QUOTATION_FORM_CODE"
  | "QUOTATION_FORM_REVISION"
  | "QUOTATION_FORM_EFFECTIVE_DATE";

/**
 * Identitas legal dan rekening sengaja tidak ditanam di source code.
 * Deployment dapat mengisinya lewat environment tanpa perlu membuat ulang
 * generator PDF. Nilai fallback hanya label netral, bukan data legal rekaan.
 */
export function getQuotationDocumentConfig() {
  const configured = {
    companyName: optionalEnv("QUOTATION_COMPANY_NAME"),
    companyAddress: optionalEnv("QUOTATION_COMPANY_ADDRESS"),
    companyEmail: optionalEnv("QUOTATION_COMPANY_EMAIL"),
    bankName: optionalEnv("QUOTATION_BANK_NAME"),
    bankAccountName: optionalEnv("QUOTATION_BANK_ACCOUNT_NAME"),
    bankAccountNumber: optionalEnv("QUOTATION_BANK_ACCOUNT_NUMBER"),
    formCode: optionalEnv("QUOTATION_FORM_CODE"),
    formRevision: optionalEnv("QUOTATION_FORM_REVISION"),
    formEffectiveDate: optionalEnv("QUOTATION_FORM_EFFECTIVE_DATE"),
  };
  const required: Array<
    [QuotationDocumentEnvironmentKey, string | null]
  > = [
    ["QUOTATION_COMPANY_NAME", configured.companyName],
    ["QUOTATION_COMPANY_ADDRESS", configured.companyAddress],
    ["QUOTATION_COMPANY_EMAIL", configured.companyEmail],
    ["QUOTATION_BANK_NAME", configured.bankName],
    ["QUOTATION_BANK_ACCOUNT_NAME", configured.bankAccountName],
    ["QUOTATION_BANK_ACCOUNT_NUMBER", configured.bankAccountNumber],
    ["QUOTATION_FORM_CODE", configured.formCode],
    ["QUOTATION_FORM_REVISION", configured.formRevision],
    ["QUOTATION_FORM_EFFECTIVE_DATE", configured.formEffectiveDate],
  ];
  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    ready: missing.length === 0,
    missing,
    companyName: configured.companyName || "Medialab Indonesia",
    companyAddress: configured.companyAddress,
    companyPhone: optionalEnv("QUOTATION_COMPANY_PHONE"),
    companyFax: optionalEnv("QUOTATION_COMPANY_FAX"),
    companyEmail: configured.companyEmail,
    companyWebsite: optionalEnv("QUOTATION_COMPANY_WEBSITE"),

    bankName: configured.bankName,
    bankAccountName: configured.bankAccountName,
    bankAccountNumber: configured.bankAccountNumber,

    formCode: configured.formCode || "FORM-QT",
    formRevision: configured.formRevision || "Rev. -",
    formEffectiveDate:
      configured.formEffectiveDate ||
      "Tanggal efektif belum dikonfigurasi",
    minimumOrder: numericEnv("QUOTATION_MINIMUM_ORDER"),
  };
}

export type QuotationDocumentConfig = ReturnType<
  typeof getQuotationDocumentConfig
>;
