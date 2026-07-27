/**
 * Support Center — tipe bersama + peta label/warna status & priority.
 * Dipakai oleh komponen customer maupun agent supaya konsisten.
 */

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SenderRole = "CUSTOMER" | "AGENT" | "SYSTEM";
export type SupportContextType =
  | "GENERAL"
  | "QUOTATION"
  | "ORDER_SAMPLE"
  | "RESULT_REVISION";
export type AttachmentKind = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";

export type SupportAttachmentDTO = {
  id?: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  downloadUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  originalSizeBytes?: number | null;
  isCompressed?: boolean;
};

export type SupportMessageDTO = {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderRole: SenderRole;
  senderName?: string | null;
  body: string;
  attachments: SupportAttachmentDTO[];
  isInternalNote: boolean;
  readByCustomerAt: string | null;
  readByAgentAt: string | null;
  createdAt: string;
};

/**
 * Pesan sisi-klien: DTO server + status optimistic (pending/failed) dan
 * clientKey stabil supaya animasi tak mengulang saat pesan sementara
 * digantikan versi asli dari server/realtime.
 */
export type ChatMessage = SupportMessageDTO & {
  pending?: boolean;
  failed?: boolean;
  clientKey?: string;
};

export type SupportTicketDTO = {
  id: string;
  ticketNo: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  contextType: SupportContextType;
  contextLabel: string | null;
  quotationId: string | null;
  quotationNo?: string | null;
  sampleId: string | null;
  sampleNo?: string | null;
  revisionId: string | null;
  revisionNo?: number | null;
  categoryId: string | null;
  categoryName?: string | null;
  customerId: string;
  customerName?: string | null;
  assignedToId: string | null;
  assignedToName?: string | null;
  lastMessageAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  rating: number | null;
  ratingComment: string | null;
  unreadForCustomer?: number;
  unreadForAgent?: number;
  createdAt: string;
  updatedAt: string;
};

export type FaqItemDTO = {
  id: string;
  question: string;
  answer: string;
  helpfulCount: number;
  notHelpfulCount: number;
};

export type FaqCategoryDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  items: FaqItemDTO[];
};

export type CannedReplyDTO = {
  id: string;
  title: string;
  body: string;
};

type Style = { label: string; badge: string; dot: string };

export const STATUS_STYLES: Record<TicketStatus, Style> = {
  OPEN: {
    label: "Open",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  WAITING_CUSTOMER: {
    label: "Waiting Customer",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  RESOLVED: {
    label: "Resolved",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  CLOSED: {
    label: "Closed",
    badge: "bg-slate-200 text-slate-600",
    dot: "bg-slate-400",
  },
};

export const PRIORITY_STYLES: Record<TicketPriority, Style> = {
  LOW: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  NORMAL: {
    label: "Normal",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  HIGH: {
    label: "High",
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  URGENT: {
    label: "Urgent",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
};

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export const TICKET_PRIORITIES: TicketPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export function statusStyle(status: TicketStatus): Style {
  return STATUS_STYLES[status] ?? STATUS_STYLES.OPEN;
}

export function priorityStyle(priority: TicketPriority): Style {
  return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.NORMAL;
}

/** Status yang dianggap "aktif" (butuh perhatian agent). */
export const OPEN_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
];

export function isOpenStatus(status: TicketStatus) {
  return OPEN_STATUSES.includes(status);
}

/** Format waktu ringkas untuk chat/list (WIB-friendly, locale id-ID). */
export function formatChatTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "x menit lalu" sederhana untuk daftar tiket. */
export function formatRelative(value: string | Date | null) {
  if (!value) return "-";

  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);

  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Tanggal absolut ringkas, dipakai di daftar tiket (audit trail). */
export function formatShortDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export type TicketPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TicketIndexEntry = {
  id: string;
  ticketNo: string;
  subject: string;
  status: TicketStatus;
  customerName: string | null;
  createdAt: string;
};

/** Preset rentang tanggal untuk DateRangePicker (basis: createdAt tiket). */
export type DatePresetKey =
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "YTD"
  | "LAST_YEAR"
  | "ALL"
  | "CUSTOM";

export const DATE_PRESET_LABELS: Record<DatePresetKey, string> = {
  TODAY: "Hari Ini",
  THIS_WEEK: "Minggu Ini",
  THIS_MONTH: "Bulan Ini",
  YTD: "Year to Date",
  LAST_YEAR: "1 Tahun Terakhir",
  ALL: "Semua Waktu",
  CUSTOM: "Custom",
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Hitung {from, to} (ISO date, lokal) untuk sebuah preset. null = tanpa batas. */
export function resolveDatePreset(
  preset: DatePresetKey
): { from: string | null; to: string | null } {
  const now = new Date();
  const todayIso = toIsoDate(now);

  switch (preset) {
    case "TODAY":
      return { from: todayIso, to: todayIso };
    case "THIS_WEEK": {
      const day = now.getDay(); // 0=Minggu
      const diffToMonday = day === 0 ? 6 : day - 1;
      const start = new Date(now);
      start.setDate(now.getDate() - diffToMonday);
      return { from: toIsoDate(start), to: todayIso };
    }
    case "THIS_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toIsoDate(start), to: todayIso };
    }
    case "YTD": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: toIsoDate(start), to: todayIso };
    }
    case "LAST_YEAR": {
      const start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      return { from: toIsoDate(start), to: todayIso };
    }
    case "ALL":
    default:
      return { from: null, to: null };
  }
}
