"use client";

import Ably from "ably";

/**
 * Ably (client-side) — SATU koneksi per tab (singleton). Penting untuk hormati
 * batas free-tier (200 concurrent connections). Semua komponen yang butuh
 * realtime memakai instance yang sama.
 *
 * Auth memakai token dari /api/support/ably-token sehingga API key tidak pernah
 * bocor ke browser. Kalau server belum dikonfigurasi (401/500), Ably akan gagal
 * connect dan hook realtime cukup no-op — UI tetap jalan lewat REST.
 */

let client: Ably.Realtime | null = null;

export function getAblyClient() {
  if (typeof window === "undefined") return null;

  if (!client) {
    client = new Ably.Realtime({
      authUrl: "/api/support/ably-token",
      authMethod: "GET",
      // Tunda koneksi sampai benar-benar dipakai (attach channel pertama).
      autoConnect: true,
      // Kurangi chatter: recover koneksi saat tab kembali fokus.
      closeOnUnload: true,
    });
  }

  return client;
}

/** Paksa refresh token/capability (mis. setelah customer membuat tiket baru). */
export async function reauthAbly() {
  const c = client;
  if (!c) return;

  try {
    await c.auth.authorize();
  } catch (error) {
    console.error("[ably] gagal reauthorize", error);
  }
}

/** Nama kanal — harus identik dengan server (src/lib/ably.ts). */
export const supportChannels = {
  ticket: (ticketId: string) => `support:ticket:${ticketId}`,
  customer: (customerId: string) => `support:customer:${customerId}`,
  desk: () => "support:desk",
};
