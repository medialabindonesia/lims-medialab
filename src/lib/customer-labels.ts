/**
 * Terjemahan istilah internal LIMS ke bahasa yang dimengerti customer.
 *
 * Dipakai HANYA untuk tampilan role customer (CUSTOMER_ENGAGEMENT). Staf
 * internal (sales, technical, lab, finance) tetap melihat kode dokumen penuh
 * dan status enum aslinya supaya rujukan antar tim tidak berubah.
 */

export type StatusTone = "neutral" | "info" | "warn" | "success" | "danger";

export type StatusMeta = {
  /** Label utama pada badge. */
  label: string;
  /** Kalimat penjelas — apa yang sedang terjadi / apa yang perlu dilakukan. */
  description: string;
  tone: StatusTone;
};

/**
 * Urutan kronologis asli (di-ground-truth dari precondition API):
 * REQUESTED → REVISION/NEGOTIATION → CONFIRMED → VERIFIED → APPROVED →
 * PO_UPLOADED → LTR_CREATED → COC_CREATED. REJECTED bersifat terminal.
 * Jangan pakai urutan deklarasi enum Prisma sebagai acuan.
 */
export const QUOTATION_FLOW_ORDER = [
  "REQUESTED",
  "REVISION",
  "NEGOTIATION",
  "CONFIRMED",
  "VERIFIED",
  "APPROVED",
  "PO_UPLOADED",
  "LTR_CREATED",
  "COC_CREATED",
] as const;

const QUOTATION_STATUS_CUSTOMER: Record<string, StatusMeta> = {
  REQUESTED: {
    label: "Menunggu persetujuan Anda",
    description: "Tinjau penawaran ini, lalu setujui atau minta revisi.",
    tone: "warn",
  },
  REVISION: {
    label: "Revisi sedang dikerjakan",
    description: "Permintaan revisi Anda sedang diproses tim kami.",
    tone: "info",
  },
  NEGOTIATION: {
    label: "Sedang dibahas",
    description: "Harga dan ruang lingkup sedang didiskusikan.",
    tone: "warn",
  },
  REJECTED: {
    label: "Penawaran ditolak",
    description: "Penawaran ini tidak dilanjutkan.",
    tone: "danger",
  },
  CONFIRMED: {
    label: "Anda sudah menyetujui",
    description: "Penawaran menunggu pemeriksaan akhir tim kami.",
    tone: "info",
  },
  VERIFIED: {
    label: "Sedang diperiksa tim kami",
    description: "Tim kami memeriksa kelengkapan penawaran.",
    tone: "info",
  },
  APPROVED: {
    label: "Penawaran final disetujui",
    description: "Silakan unggah PO agar pekerjaan bisa dijadwalkan.",
    tone: "success",
  },
  PO_UPLOADED: {
    label: "PO Anda diterima",
    description: "Kami sedang menyiapkan surat tugas pengambilan sample.",
    tone: "success",
  },
  LTR_CREATED: {
    label: "Surat tugas terbit",
    description: "Petugas kami akan mengatur pengambilan sample.",
    tone: "success",
  },
  COC_CREATED: {
    label: "Sample siap dijadwalkan",
    description: "Dokumen serah terima sample sudah disiapkan.",
    tone: "success",
  },
};

/** Status quotation dalam bahasa customer. Fallback aman untuk enum baru. */
export function quotationStatusMeta(status: string): StatusMeta {
  return (
    QUOTATION_STATUS_CUSTOMER[status] || {
      label: status.replaceAll("_", " ").toLowerCase(),
      description: "Status pesanan sedang diperbarui.",
      tone: "neutral",
    }
  );
}

export type ParsedDocumentNumber = {
  /** Kode penuh apa adanya, mis. "QT-20260805-815792-REV1". */
  full: string;
  /** Nomor pendek untuk disebut lewat telepon/WA, mis. "#815792". */
  short: string;
  /** Nomor revisi bila ada (1, 2, ...). */
  revision: number | null;
};

/**
 * Pecah nomor dokumen berformat `PREFIX-YYYYMMDD-XXXXXX[-REVn]`.
 * Kalau formatnya tidak dikenali, kode penuh dipakai apa adanya sebagai
 * nomor pendek — lebih baik menampilkan sesuatu yang benar daripada memotong
 * kode secara sembarangan.
 */
export function parseDocumentNumber(full: string): ParsedDocumentNumber {
  const revMatch = full.match(/-REV(\d+)$/);
  const revision = revMatch ? Number(revMatch[1]) : null;
  const base = full.replace(/-REV\d+$/, "");
  const parts = base.split("-");
  const serial = parts.length >= 3 ? parts[parts.length - 1] : "";

  return {
    full,
    short: /^\d{4,}$/.test(serial) ? `#${serial}` : full,
    revision,
  };
}

/**
 * Judul pesanan yang manusiawi: nama template analisis + tanggal.
 * Kode dokumen sengaja TIDAK dipakai sebagai judul karena customer sulit
 * membedakan dua kode yang mirip.
 */
export function humanOrderTitle(
  templateName: string | null | undefined,
  fallback = "Pengujian Laboratorium"
) {
  const name = templateName?.trim();

  if (!name) return fallback;

  return /^(uji|analisa|analisis|pengujian|pemeriksaan)/i.test(name)
    ? name
    : `Uji ${name}`;
}

export function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return null;

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger: "bg-red-50 text-red-700 border-red-200",
};

export const STATUS_DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-slate-400",
  info: "bg-blue-500",
  warn: "bg-amber-500",
  success: "bg-emerald-500",
  danger: "bg-red-500",
};
