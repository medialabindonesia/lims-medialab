export type EmailAttachment = {
  filename: string;
  content: string;
};

export type TransactionalEmail = {
  to: string;
  cc?: string[];
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
  /**
   * Kunci unik untuk satu draft pengiriman. Provider memakai nilai ini agar
   * retry akibat timeout tidak mengirim quotation yang sama dua kali.
   */
  idempotencyKey?: string;
};

export type EmailDeliveryConfiguration = {
  provider: "resend";
  ready: boolean;
  missing: Array<"RESEND_API_KEY" | "MAIL_FROM">;
  from: string | null;
  replyTo: string | null;
};

export function getEmailDeliveryConfiguration(): EmailDeliveryConfiguration {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const from = process.env.MAIL_FROM?.trim() || "";
  const replyTo = process.env.MAIL_REPLY_TO?.trim() || "";
  const missing: EmailDeliveryConfiguration["missing"] = [];

  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!from) missing.push("MAIL_FROM");

  return {
    provider: "resend",
    ready: missing.length === 0,
    missing,
    from: from || null,
    replyTo: replyTo || null,
  };
}

/**
 * Adapter produksi memakai REST API Resend langsung agar request dapat
 * dibatalkan dengan AbortSignal.timeout. SDK resmi digunakan oleh skrip
 * `pnpm email:test` untuk memverifikasi key secara terpisah.
 * Draft tetap dapat dibuat tanpa konfigurasi; endpoint send akan menjelaskan
 * variabel environment yang belum tersedia dan tidak berpura-pura sukses.
 */
export async function sendTransactionalEmail(message: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const configuration = getEmailDeliveryConfiguration();

  if (!configuration.ready || !configuration.from) {
    throw new Error(
      `Pengiriman email belum dikonfigurasi. Isi ${configuration.missing.join(
        " dan "
      )}.`
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(message.idempotencyKey
        ? { "Idempotency-Key": message.idempotencyKey }
        : {}),
    },
    body: JSON.stringify({
      from: configuration.from,
      to: [message.to],
      cc: message.cc?.length ? message.cc : undefined,
      reply_to: configuration.replyTo || undefined,
      subject: message.subject,
      text: message.text,
      attachments: message.attachments,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message || `Provider email gagal (${response.status})`);
  }

  return { providerMessageId: payload?.id ?? null };
}
