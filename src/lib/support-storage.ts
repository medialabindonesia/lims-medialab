import path from "node:path";

/**
 * Storage lampiran support: disimpan di disk VPS, bukan object storage eksternal.
 *
 * Di produksi nginx melayani `/uploads/` langsung dari disk (jauh lebih cepat
 * daripada lewat Node). Saat `next dev` tidak ada nginx, jadi rewrite di
 * next.config.ts mengarahkan `/uploads/*` ke route handler `/api/support/files/*`.
 */

/** Root folder penyimpanan di server. Override lewat env SUPPORT_UPLOAD_DIR. */
export function supportUploadDir() {
  return (
    process.env.SUPPORT_UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads")
  );
}

/** URL publik yang disimpan ke DB dan dipakai <img>/<video> di browser. */
export function supportUploadUrl(ticketId: string, fileName: string) {
  return `/uploads/${encodeURIComponent(ticketId)}/${encodeURIComponent(
    fileName
  )}`;
}
