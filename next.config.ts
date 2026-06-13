import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan akses dev resources (HMR, dll) dari device lain di jaringan lokal.
  // Tambahkan IP/host device penguji di sini bila berbeda.
  allowedDevOrigins: ["192.168.0.102", "localhost"],
};

export default nextConfig;
