// Konfigurasi PM2 untuk LIMS Medialab di VPS.
//
// Satu file ini melayani semua environment (production, development,
// marketing, coa). Nilai default sengaja dibuat identik dengan produksi yang
// sudah berjalan, sehingga menjalankannya tanpa variabel apa pun berperilaku
// persis seperti sebelum file ini diparameterisasi.
const appRoot = process.env.APP_ROOT || "/opt/apps/lims-medialab";
const appName = process.env.APP_NAME || "lims-medialab";
const appPort = process.env.APP_PORT || "3001";
const currentPath = `${appRoot}/current`;

module.exports = {
  apps: [
    {
      name: appName,
      cwd: currentPath,
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: appPort,
        APP_VERSION: process.env.APP_VERSION || "unknown",
        // Menandai environment agar bisa ditampilkan di UI dan log.
        APP_ENV: process.env.APP_ENV || "production",
        // Next.js jalan di belakang nginx; heap 2 GB cukup untuk render PDF/Excel.
        NODE_OPTIONS: "--max-old-space-size=2048",
      },
      max_memory_restart: "1500M",
      autorestart: true,
      // Jangan restart-loop kalau app crash saat boot.
      min_uptime: "30s",
      max_restarts: 10,
      error_file: `${appRoot}/shared/logs/${appName}.error.log`,
      out_file: `${appRoot}/shared/logs/${appName}.out.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
