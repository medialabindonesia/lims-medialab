export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function samplingByLabel(value?: string | null) {
  const labels: Record<string, string> = {
    MEDIALAB: "Medialab",
    CUSTOMER: "Customer",
    THIRD_PARTY: "Third Party",
  };

  return value ? labels[value] || value : "-";
}

export function testingObjectiveLabel(value?: string | null) {
  const labels: Record<string, string> = {
    ROUTINE_MONITORING: "Routine Monitoring",
    SUPERVISION: "Supervision",
    CASE_PROOF: "Case Proof",
    RESEARCH: "Research",
    OTHER: "Other",
  };

  return value ? labels[value] || value : "-";
}

export function tatLabel(value?: string | null) {
  const labels: Record<string, string> = {
    NORMAL: "Normal",
    URGENT: "Urgent",
    TOP_URGENT: "Top Urgent",
  };

  return value ? labels[value] || value : "-";
}