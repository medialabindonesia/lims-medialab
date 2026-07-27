import type { AttachmentKind } from "@/lib/support";

export const SUPPORT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const SUPPORT_ACCEPT =
  "image/*,video/mp4,video/webm,video/quicktime,audio/*,.pdf,.txt,.csv,.xls,.xlsx,.xlsm,.ods,.doc,.docx";

export const MAX_SUPPORT_UPLOAD_BYTES = 250 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function attachmentKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

export function isAllowedSupportFile(file: { type: string; size: number }) {
  return (
    SUPPORT_ALLOWED_MIME_TYPES.includes(
      file.type.toLowerCase() as (typeof SUPPORT_ALLOWED_MIME_TYPES)[number]
    ) && file.size > 0 && file.size <= MAX_SUPPORT_UPLOAD_BYTES
  );
}

export function safeSupportFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
}
