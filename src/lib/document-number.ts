export function generateDocumentNo(prefix: string) {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = String(now.getTime()).slice(-6);

  return `${prefix}-${year}${month}${day}-${time}`;
}

export function generateRevisionQuotationNo(currentQuotationNo: string) {
  const revMatch = currentQuotationNo.match(/-REV(\d+)$/);

  if (!revMatch) {
    return `${currentQuotationNo}-REV1`;
  }

  const currentRev = Number(revMatch[1] || 0);
  const nextRev = currentRev + 1;

  return currentQuotationNo.replace(/-REV\d+$/, `-REV${nextRev}`);
}