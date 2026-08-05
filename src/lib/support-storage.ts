import path from "node:path";

function localSupportUploadDir() {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "storage",
    "uploads"
  );
}

/**
 * Storage lampiran support: disimpan di disk VPS, bukan object storage eksternal.
 *
 * Di produksi nginx melayani `/uploads/` langsung dari disk (jauh lebih cepat
 * daripada lewat Node). Saat `next dev` tidak ada nginx, jadi rewrite di
 * next.config.ts mengarahkan `/uploads/*` ke route handler `/api/support/files/*`.
 */

/** Root folder penyimpanan di server. Override lewat env SUPPORT_UPLOAD_DIR. */
export function supportUploadDir() {
  return process.env.SUPPORT_UPLOAD_DIR || localSupportUploadDir();
}

/** Kandidat berurutan. Kandidat kedua membuat upload tetap berfungsi bila
 * konfigurasi lama menunjuk direktori yang tidak dimiliki user proses Node. */
export function supportUploadDirCandidates() {
  return [
    supportUploadDir(),
    process.env.SUPPORT_UPLOAD_FALLBACK_DIR,
    localSupportUploadDir(),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => path.resolve(value))
    .filter((value, index, all) => all.indexOf(value) === index);
}

/** URL publik yang disimpan ke DB dan dipakai <img>/<video> di browser. */
export function supportUploadUrl(
  ticketId: string,
  fileName: string,
  throughApplication = false
) {
  const prefix = throughApplication ? "/api/support/files" : "/uploads";
  return `${prefix}/${encodeURIComponent(ticketId)}/${encodeURIComponent(
    fileName
  )}`;
}
