import type { QuotationPricingStatus } from "@prisma/client";

/**
 * Kode induk pesanan yang diwarisi seluruh dokumen turunan.
 *
 *   ORDER  ML-26-0148
 *     Quotation  ML-26-0148-QT      (revisi: -QT-R1)
 *     LTR        ML-26-0148-LTR
 *     CoC        ML-26-0148-COC
 *     Invoice    ML-26-0148-INV
 *
 * Tujuannya agar sales, lab, finance, dan admin menyebut angka yang sama untuk
 * pesanan yang sama. `Quotation.id` tetap cuid sebagai primary key.
 */

const ORDER_PREFIX = "ML";
const SEQUENCE_PADDING = 4;

export function orderCodePrefix(date = new Date()) {
  const year = String(date.getFullYear()).slice(-2);
  return `${ORDER_PREFIX}-${year}-`;
}

type QuotationFinder = {
  quotation: {
    findFirst: (args: {
      where: { orderCode: { startsWith: string } };
      orderBy: { orderCode: "desc" };
      select: { orderCode: true };
    }) => Promise<{ orderCode: string | null } | null>;
  };
};

/**
 * Nomor urut berikutnya dalam tahun berjalan.
 *
 * Pemanggil wajib menangani tabrakan unique constraint dengan mencoba ulang:
 * dua request bersamaan bisa membaca nomor terakhir yang sama. Lihat
 * `createWithOrderCode`.
 */
export async function nextOrderCode(db: QuotationFinder, date = new Date()) {
  const prefix = orderCodePrefix(date);

  const last = await db.quotation.findFirst({
    where: { orderCode: { startsWith: prefix } },
    orderBy: { orderCode: "desc" },
    select: { orderCode: true },
  });

  const lastSequence = last?.orderCode
    ? Number.parseInt(last.orderCode.slice(prefix.length), 10)
    : 0;

  const next = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

  return `${prefix}${String(next).padStart(SEQUENCE_PADDING, "0")}`;
}

/**
 * Menjalankan `attempt` dengan kode pesanan baru, mencoba ulang bila kode
 * keburu dipakai request lain (Prisma P2002 pada kolom unique).
 */
export async function createWithOrderCode<T>(
  db: QuotationFinder,
  attempt: (orderCode: string) => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  let lastError: unknown = null;

  for (let tries = 0; tries < maxAttempts; tries += 1) {
    const orderCode = await nextOrderCode(db);

    try {
      return await attempt(orderCode);
    } catch (error) {
      const code = (error as { code?: string })?.code;

      if (code !== "P2002") throw error;

      lastError = error;
    }
  }

  throw lastError ?? new Error("Gagal menghasilkan kode pesanan unik");
}

export type DocumentKind = "QT" | "LTR" | "COC" | "COA" | "INV" | "STPS";

export function documentCode(orderCode: string | null, kind: DocumentKind) {
  if (!orderCode) return null;
  return `${orderCode}-${kind}`;
}

export function quotationDocumentCode(
  orderCode: string | null,
  revisionNo = 0
) {
  const base = documentCode(orderCode, "QT");
  if (!base) return null;
  return revisionNo > 0 ? `${base}-R${revisionNo}` : base;
}

/**
 * Nomor quotation untuk revisi berikutnya, dibaca dari nomor yang sedang
 * berlaku. Mengembalikan null bila quotation belum punya order code (data
 * lama), sehingga pemanggil bisa jatuh ke penomoran lama.
 */
export function nextQuotationRevisionCode(
  orderCode: string | null,
  currentQuotationNo: string
) {
  if (!orderCode) return null;

  const match = currentQuotationNo.match(/-QT-R(\d+)$/);
  const current = match ? Number.parseInt(match[1], 10) : 0;

  return quotationDocumentCode(
    orderCode,
    (Number.isFinite(current) ? current : 0) + 1
  );
}

export function sampleCode(orderCode: string | null, sequence: number) {
  if (!orderCode) return null;
  return `${orderCode}-S${String(sequence).padStart(2, "0")}`;
}

/**
 * Status harga sebuah quotation.
 *
 * `null` pada harga item berarti BELUM DITETAPKAN, berbeda dari 0. Sales boleh
 * menyimpan dan mengirim quotation tanpa harga, tetapi tidak boleh
 * melewati APPROVED sebelum seluruh harga terisi.
 */
export function computePricingStatus(
  prices: Array<number | null>
): QuotationPricingStatus {
  if (prices.length === 0) return "UNPRICED";

  const pricedCount = prices.filter((price) => price !== null).length;

  if (pricedCount === 0) return "UNPRICED";
  if (pricedCount < prices.length) return "PARTIAL";

  return "PRICED";
}

export const PRICING_GATE_MESSAGE =
  "Masih ada parameter tanpa harga. Lengkapi harga terlebih dahulu sebelum quotation di-approve.";
