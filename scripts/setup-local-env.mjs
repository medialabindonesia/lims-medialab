#!/usr/bin/env node
//
// Membuat .env untuk pengembangan LOKAL di laptop masing-masing developer.
//
// Berkas .env milik VPS TIDAK boleh disalin ke laptop: isinya kredensial
// server, dan memakainya berarti laptop menulis langsung ke database VPS —
// membatalkan pemisahan database antar-branch yang justru sedang kita jaga.
// Setiap orang menjalankan skrip ini sekali, dan mendapat database sendiri.
//
//   node scripts/setup-local-env.mjs
//   node scripts/setup-local-env.mjs --port 3308 --force

import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const force = args.includes("--force");

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) return fallback;
  return args[index + 1];
}

// 3306 sering sudah dipakai MySQL/MariaDB yang terpasang langsung di Windows,
// jadi container pengembangan memakai 3307 agar tidak bentrok.
const dbPort = argValue("--port", "3307");
const dbName = argValue("--db", "lims_dev");
const dbUser = dbName;
const dbPassword = argValue("--password", "lims_dev_password");
const containerName = argValue("--container", "lims-dev-mariadb");

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath) && !force) {
  console.error(
    `\n.env sudah ada di ${envPath}\n` +
      `Skrip ini menolak menimpanya supaya konfigurasi Anda tidak hilang.\n` +
      `Jalankan ulang dengan --force bila memang ingin menggantinya.\n`
  );
  process.exit(1);
}

const jwtSecret = randomBytes(48).toString("base64");

const content = `# Konfigurasi pengembangan LOKAL. Jangan pernah di-commit (.gitignore).
# Dibuat oleh: node scripts/setup-local-env.mjs
#
# Berkas ini HANYA untuk laptop Anda. Server punya .env sendiri di
# /opt/apps/lims-medialab-<environment>/shared/.env dan tidak perlu disalin
# ke sini.

DATABASE_URL="mysql://${dbUser}:${dbPassword}@127.0.0.1:${dbPort}/${dbName}"

# Dibutuhkan hanya saat membuat migrasi baru (prisma migrate dev).
SHADOW_DATABASE_URL="mysql://root:root_dev_password@127.0.0.1:${dbPort}/${dbName}_shadow"

# Dibangkitkan acak khusus untuk laptop ini.
JWT_SECRET="${jwtSecret}"

# Menyalakan pita penanda environment supaya tidak tertukar dengan produksi.
APP_ENV="development"
NEXT_PUBLIC_APP_ENV="development"

# Akun demo ditampilkan di halaman login untuk memudahkan pengembangan.
NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="true"

# Fitur realtime support otomatis no-op selama dikosongkan.
ABLY_API_KEY=""
`;

writeFileSync(envPath, content);

console.log(`
.env lokal dibuat: ${envPath}

Langkah berikutnya
------------------

1. Jalankan database (butuh Docker Desktop menyala):

   docker run -d --name ${containerName} \\
     -e MARIADB_ROOT_PASSWORD=root_dev_password \\
     -e MARIADB_DATABASE=${dbName} \\
     -e MARIADB_USER=${dbUser} \\
     -e MARIADB_PASSWORD=${dbPassword} \\
     -p ${dbPort}:3306 mariadb:11.4

   Kalau container-nya sudah pernah dibuat, cukup:  docker start ${containerName}

2. Bentuk tabelnya:

   pnpm exec prisma migrate deploy

3. Isi data awal (role, menu, akun demo, master matriks):

   pnpm db:seed

4. Jalankan aplikasi:

   pnpm dev

Akun demo tercetak di akhir langkah 3.
Rincian lengkap ada di docs/DEVELOPMENT.md
`);
