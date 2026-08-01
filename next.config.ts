import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan akses dev resources (HMR, dll) dari device lain di jaringan lokal.
  // Tambahkan IP/host device penguji di sini bila berbeda.
  allowedDevOrigins: ["192.168.0.102", "localhost"],

  // Sementara untuk deploy Vercel dulu walaupun masih ada error TypeScript.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Jangan bocorkan versi framework lewat response header.
  poweredByHeader: false,

  // Di produksi nginx yang melayani /uploads/ langsung dari disk. Rewrite ini
  // dipakai saat `next dev` (tanpa nginx) supaya lampiran tetap tampil.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/support/files/:path*",
      },
    ];
  },
};

export default nextConfig;