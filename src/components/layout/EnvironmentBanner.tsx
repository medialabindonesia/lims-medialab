/**
 * Penanda environment.
 *
 * Empat situs LIMS berjalan di VPS yang sama dengan tampilan identik
 * (produksi, development, marketing, coa). Tanpa penanda, sangat mudah
 * mengira sedang menguji di marketing padahal sedang di produksi. Banner ini
 * tidak pernah muncul di produksi, sehingga keberadaannya sendiri sudah
 * menjadi sinyal "ini bukan data sungguhan".
 */

const ENVIRONMENT_LABELS: Record<string, { label: string; tone: string }> = {
  development: {
    label: "DEVELOPMENT",
    tone: "bg-slate-700",
  },
  marketing: {
    label: "MARKETING — data uji, bukan data pelanggan sungguhan",
    tone: "bg-indigo-600",
  },
  coa: {
    label: "COA — data uji, bukan data pelanggan sungguhan",
    tone: "bg-teal-700",
  },
};

export default function EnvironmentBanner() {
  const environment = process.env.NEXT_PUBLIC_APP_ENV;

  // Produksi dan environment yang tidak dikenal tidak menampilkan apa pun.
  if (!environment) return null;

  const config = ENVIRONMENT_LABELS[environment];
  if (!config) return null;

  return (
    <div
      role="status"
      className={`${config.tone} px-4 py-1 text-center text-[11px] font-black uppercase tracking-[0.12em] text-white`}
    >
      {config.label}
    </div>
  );
}
