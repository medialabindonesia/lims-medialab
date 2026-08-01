// Konfigurasi PM2 untuk LIMS Medialab di VPS.
// Jalankan: pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "lims-medialab",
      cwd: "/opt/apps/lims-medialab",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        // Next.js jalan di belakang nginx; heap 2 GB cukup untuk render PDF/Excel.
        NODE_OPTIONS: "--max-old-space-size=2048",
      },
      max_memory_restart: "1500M",
      autorestart: true,
      // Jangan restart-loop kalau app crash saat boot.
      min_uptime: "30s",
      max_restarts: 10,
      error_file: "/www/wwwlogs/lims-medialab.error.log",
      out_file: "/www/wwwlogs/lims-medialab.out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
