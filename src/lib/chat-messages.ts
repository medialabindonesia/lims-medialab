import type { ChatMessage, SupportMessageDTO, SenderRole } from "@/lib/support";

function newClientKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Buat pesan optimistic (langsung tampil sebelum server merespons). */
export function makeOptimistic(params: {
  ticketId: string;
  senderRole: Extract<SenderRole, "CUSTOMER" | "AGENT">;
  senderName: string;
  body: string;
  isInternalNote: boolean;
}): ChatMessage {
  const clientKey = newClientKey();
  return {
    id: clientKey,
    clientKey,
    ticketId: params.ticketId,
    senderId: null,
    senderRole: params.senderRole,
    senderName: params.senderName,
    body: params.body,
    isInternalNote: params.isInternalNote,
    readByCustomerAt: null,
    readByAgentAt: null,
    createdAt: new Date().toISOString(),
    pending: true,
  };
}

/**
 * Gabungkan pesan "asli" (dari POST atau realtime) ke daftar. Jika ada pesan
 * optimistic yang cocok (masih pending, role+body sama), gantikan sambil
 * mempertahankan clientKey agar animasi tidak mengulang. Idempoten terhadap
 * duplikat (echo realtime + respons POST).
 */
export function ingestReal(
  prev: ChatMessage[],
  real: SupportMessageDTO
): ChatMessage[] {
  // Sudah ada versi final (bukan pending) dengan id sama → tak berubah.
  if (prev.some((m) => m.id === real.id && !m.pending)) return prev;

  const idx = prev.findIndex(
    (m) => m.pending && m.senderRole === real.senderRole && m.body === real.body
  );

  if (idx >= 0) {
    const copy = [...prev];
    copy[idx] = { ...real, clientKey: copy[idx].clientKey };
    return copy;
  }

  if (prev.some((m) => m.id === real.id)) return prev;
  return [...prev, real];
}

/** Tandai pesan optimistic gagal terkirim (tampil tombol coba lagi). */
export function markFailed(
  prev: ChatMessage[],
  clientKey: string
): ChatMessage[] {
  return prev.map((m) =>
    m.clientKey === clientKey ? { ...m, pending: false, failed: true } : m
  );
}

export function removeByKey(
  prev: ChatMessage[],
  clientKey: string
): ChatMessage[] {
  return prev.filter((m) => m.clientKey !== clientKey);
}

/** Setel flag "dibaca" pada semua pesan dari role tertentu. */
export function applyRead(
  prev: ChatMessage[],
  reader: "CUSTOMER" | "AGENT",
  at: string
): ChatMessage[] {
  if (reader === "AGENT") {
    return prev.map((m) =>
      m.senderRole === "CUSTOMER" && !m.readByAgentAt
        ? { ...m, readByAgentAt: at }
        : m
    );
  }
  return prev.map((m) =>
    m.senderRole === "AGENT" && !m.readByCustomerAt
      ? { ...m, readByCustomerAt: at }
      : m
  );
}
