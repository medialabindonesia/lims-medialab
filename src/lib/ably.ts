import Ably from "ably";

/**
 * Ably (server-side) — dipakai API route untuk publish event realtime SETELAH
 * menulis ke DB. DB tetap source-of-truth; Ably hanya transport.
 *
 * Aman kalau ABLY_API_KEY belum diisi: helper akan no-op (fitur tetap jalan
 * lewat REST, hanya kehilangan update instan). Ini mencegah error runtime di
 * environment yang belum dikonfigurasi (mis. preview build).
 */

const globalForAbly = globalThis as unknown as {
  ablyRest?: Ably.Rest;
};

export function ablyConfigured() {
  return Boolean(process.env.ABLY_API_KEY);
}

export function getAblyRest() {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) return null;

  if (!globalForAbly.ablyRest) {
    globalForAbly.ablyRest = new Ably.Rest({ key: apiKey });
  }

  return globalForAbly.ablyRest;
}

/** Nama kanal — satu sumber kebenaran supaya server & client tak beda string. */
export const supportChannels = {
  ticket: (ticketId: string) => `support:ticket:${ticketId}`,
  customer: (customerId: string) => `support:customer:${customerId}`,
  desk: () => "support:desk",
};

/**
 * Publish tanpa pernah melempar error ke alur utama. Kegagalan realtime tidak
 * boleh menggagalkan penyimpanan pesan yang sudah sukses.
 */
export async function publishSupport(
  channel: string,
  event: string,
  data: unknown
) {
  const rest = getAblyRest();

  if (!rest) return;

  try {
    await rest.channels.get(channel).publish(event, data);
  } catch (error) {
    console.error("[ably] gagal publish", { channel, event, error });
  }
}
