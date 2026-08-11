/**
 * Pemisah antara DURASI sampling dan METODE sampling.
 *
 * MASALAH YANG DIPECAHKAN
 * -----------------------
 * Pada `MENU PENGUJIAN 2024.xlsx` kolom `SAMPLING METHOD` berisi dua hal yang
 * sebenarnya berbeda dan tercampur dalam satu kolom:
 *
 *   - lamanya pengambilan contoh uji  → "8 hours", "24 jam", "1 years", "Grab"
 *   - cara pengambilan contoh uji     → "Isokinetik (APEX)", "SNI 8990:2021"
 *
 * Konversi terdahulu memasukkan SELURUH isi kolom itu ke master durasi,
 * sehingga tabel `SamplingDuration` berisi 33 baris: metode sampling ikut
 * masuk, dan satuan waktu yang sama tercatat berkali-kali dengan ejaan
 * berbeda ("8 hours", "8 Hours", "8 jam", "H8").
 *
 * Berkas ini menjadi satu-satunya tempat aturan pemisahan itu ditulis, supaya
 * converter dan script sync tidak pernah berbeda pendapat.
 *
 * BAHASA LABEL
 * ------------
 * Nama matriks dan regulasi sengaja dipertahankan dalam bahasa Inggris persis
 * seperti berkas sumber. Label durasi TIDAK bisa ikut aturan itu karena satu
 * durasi ditulis dengan beberapa ejaan bahasa di sumbernya, jadi salah satu
 * harus dipilih sebagai bentuk baku. Dipilih Bahasa Indonesia agar sama dengan
 * surat penawaran yang dicetak untuk customer.
 */

export type CanonicalDuration = {
  code: string;
  label: string;
  /// Hanya untuk pengurutan. Grab (sesaat) tidak punya durasi terukur.
  minutes: number | null;
  sort: number;
};

/**
 * Durasi yang benar-benar muncul pada berkas sumber, sudah diseragamkan.
 * Ditulis eksplisit — bukan dibangkitkan otomatis — supaya penambahan durasi
 * baru menjadi keputusan sadar, bukan efek samping salah ketik di Excel.
 */
export const CANONICAL_DURATIONS: CanonicalDuration[] = [
  { code: "GRAB", label: "Grab (Sesaat)", minutes: null, sort: 0 },
  { code: "H1", label: "1 Jam", minutes: 60, sort: 10 },
  { code: "H3", label: "3 Jam", minutes: 180, sort: 20 },
  { code: "H8", label: "8 Jam", minutes: 480, sort: 30 },
  { code: "H24", label: "24 Jam", minutes: 1440, sort: 40 },
  { code: "D30", label: "30 Hari", minutes: 43200, sort: 50 },
  { code: "D90", label: "90 Hari", minutes: 129600, sort: 60 },
  { code: "Y1", label: "1 Tahun", minutes: 525600, sort: 70 },
];

const BY_CODE = new Map(CANONICAL_DURATIONS.map((item) => [item.code, item]));
const BY_LABEL = new Map(
  CANONICAL_DURATIONS.map((item) => [item.label.toLowerCase(), item]),
);

export type SamplingEntry =
  | { kind: "duration"; duration: CanonicalDuration }
  | { kind: "method"; label: string }
  | { kind: "empty" };

/**
 * Jumlah menit per satuan waktu, dipakai untuk membentuk kode durasi.
 * Kunci ditulis dalam dua bahasa karena berkas sumber memakai keduanya,
 * kadang pada baris yang bersebelahan.
 */
const TIME_UNITS: Array<{
  match: RegExp;
  prefix: string;
  minutesPerUnit: number;
}> = [
  { match: /^(?:minutes?|menit|min)$/i, prefix: "M", minutesPerUnit: 1 },
  { match: /^(?:hours?|jam|hrs?|h)$/i, prefix: "H", minutesPerUnit: 60 },
  { match: /^(?:days?|hari|d)$/i, prefix: "D", minutesPerUnit: 1440 },
  { match: /^(?:years?|tahun|thn|y)$/i, prefix: "Y", minutesPerUnit: 525600 },
];

/**
 * Menentukan apakah satu sel `SAMPLING METHOD` berisi durasi atau metode.
 *
 * Aturannya sengaja konservatif: hanya teks yang benar-benar berbentuk
 * "<angka> <satuan waktu>" atau varian kata "grab" yang diakui sebagai durasi.
 * Apa pun selain itu — termasuk nomor SNI yang mengandung angka — diperlakukan
 * sebagai metode sampling, karena salah menebak akan mengotori master durasi
 * persis seperti kejadian sebelumnya.
 */
export function classifySamplingEntry(raw: string): SamplingEntry {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) return { kind: "empty" };

  // "Grab", "grab", "Grab (s)", "Grab (Sesaat)", "Sesaat".
  if (/^(?:grab|sesaat)\b/i.test(value)) {
    return { kind: "duration", duration: BY_CODE.get("GRAB")! };
  }

  // Label yang sudah berbentuk baku, mis. hasil ekspor sistem sendiri.
  const known = BY_LABEL.get(value.toLowerCase());
  if (known) return { kind: "duration", duration: known };
  if (BY_CODE.has(value.toUpperCase())) {
    return { kind: "duration", duration: BY_CODE.get(value.toUpperCase())! };
  }

  const timeMatch = value.match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-z]+)$/);
  if (timeMatch) {
    const amount = Number(timeMatch[1].replace(",", "."));
    const unit = TIME_UNITS.find((item) => item.match.test(timeMatch[2]));

    if (unit && Number.isFinite(amount) && amount > 0) {
      const code = `${unit.prefix}${
        Number.isInteger(amount) ? amount : String(amount).replace(".", "_")
      }`;
      const existing = BY_CODE.get(code);
      if (existing) return { kind: "duration", duration: existing };

      // Durasi yang sah tetapi belum terdaftar. Dikembalikan apa adanya agar
      // terlihat pada laporan konversi, bukan dibuang diam-diam.
      return {
        kind: "duration",
        duration: {
          code,
          label: formatIndonesianDuration(amount, unit.prefix),
          minutes: Math.round(amount * unit.minutesPerUnit),
          sort: 900,
        },
      };
    }
  }

  return { kind: "method", label: value };
}

function formatIndonesianDuration(amount: number, prefix: string) {
  const noun =
    prefix === "M"
      ? "Menit"
      : prefix === "H"
        ? "Jam"
        : prefix === "D"
          ? "Hari"
          : "Tahun";
  return `${amount} ${noun}`;
}
