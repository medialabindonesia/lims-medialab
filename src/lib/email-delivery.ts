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
};

/**
 * Adapter pengiriman minimal memakai REST API Resend tanpa dependency baru.
 * Draft tetap dapat dibuat tanpa konfigurasi; endpoint send akan menjelaskan
 * variabel environment yang belum tersedia dan tidak berpura-pura sukses.
 */
export async function sendTransactionalEmail(message: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "Pengiriman email belum dikonfigurasi. Isi RESEND_API_KEY dan MAIL_FROM."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      cc: message.cc?.length ? message.cc : undefined,
      subject: message.subject,
      text: message.text,
      attachments: message.attachments,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message || `Provider email gagal (${response.status})`);
  }

  return { providerMessageId: payload?.id ?? null };
}

