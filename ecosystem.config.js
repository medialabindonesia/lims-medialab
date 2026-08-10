// Konfigurasi PM2 untuk LIMS Medialab di VPS.
// APP_ROOT dapat dioverride jika aplikasi tidak dipasang di /opt/apps.
// APP_NAME dan PORT dapat dioverride agar beberapa environment (produksi,
// coa, ...) bisa hidup berdampingan di VPS yang sama lewat proses PM2 sendiri.
const appRoot = process.env.APP_ROOT || "/opt/apps/lims-medialab";
const currentPath = `${appRoot}/current`;
const appName = process.env.APP_NAME || appRoot.split("/").filter(Boolean).pop();
const port = process.env.PORT || "3001";

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
        PORT: port,
        APP_VERSION: process.env.APP_VERSION || "unknown",
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
