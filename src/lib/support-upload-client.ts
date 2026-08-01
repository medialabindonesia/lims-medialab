"use client";

import { safeSupportFileName } from "@/lib/support-attachments";

/**
 * Kirim file ke storage lokal VPS lewat `/api/support/upload`.
 *
 * Pakai XMLHttpRequest, bukan fetch, karena hanya XHR yang memberi progress
 * upload — bar progress di composer bergantung padanya. Body-nya file mentah
 * (bukan FormData) supaya server bisa stream langsung ke disk.
 */
export function uploadToServer(
  ticketId: string,
  file: File,
  onProgress: (percentage: number) => void
): Promise<{ url: string; downloadUrl?: string }> {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({
      ticketId,
      filename: safeSupportFileName(file.name),
    });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/support/upload?${query.toString()}`);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload: { url?: string; downloadUrl?: string; message?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        // Biarkan payload kosong; pesan error generik di bawah yang dipakai.
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        resolve({ url: payload.url, downloadUrl: payload.downloadUrl });
      } else {
        reject(new Error(payload.message || `${file.name}: gagal diunggah`));
      }
    };
    xhr.onerror = () =>
      reject(new Error(`${file.name}: koneksi terputus saat mengunggah`));
    xhr.onabort = () => reject(new Error(`${file.name}: upload dibatalkan`));

    xhr.send(file);
  });
}
