# Deployment Ubuntu 24.04 dengan GitHub Actions

Target yang didukung oleh konfigurasi ini:

- Ubuntu 24.04 LTS x86_64
- Node.js 22, pnpm 10.15.0, dan PM2
- Nginx sebagai reverse proxy
- MariaDB/MySQL melalui Prisma
- aplikasi di `/opt/apps/lims-medialab`
- Next.js mendengarkan hanya melalui Nginx pada port `3001`

Setiap push ke `main` menjalankan lint, migrasi pada database CI sementara, dan
build. Jika semuanya lolos, source dikirim ke release baru di VPS, dibangun
dengan environment produksi, dimigrasikan, kemudian diaktifkan melalui symlink
`current`. Health check yang gagal akan mengembalikan kode aplikasi sebelumnya.

## 1. Siapkan VPS

Login sebagai user yang memiliki akses `sudo`, lalu pasang utilitas dasar:

```bash
sudo apt update
sudo apt install -y rsync curl openssh-server util-linux ca-certificates
```

Tangkapan layar menunjukkan server dikelola melalui panel. Jika aaPanel sudah
memasang Nginx, gunakan instalasi tersebut dan jangan memasang Nginx kedua dari
APT. Hanya bila belum ada web server, jalankan `sudo apt install -y nginx`.

Pasang Node.js 22 secara system-wide dari sumber paket Node.js yang Anda
percaya. Paket Node bawaan Ubuntu 24.04 terlalu lama untuk Prisma 7 pada proyek
ini. Setelah `node --version` menunjukkan `v22.x`, jalankan:

```bash
sudo corepack enable
sudo corepack prepare pnpm@10.15.0 --activate
sudo npm install --global pm2
node --version
pnpm --version
pm2 --version
```

Jika memakai Node Version Manager dari aaPanel, pastikan `node`, `pnpm`, dan
`pm2` juga tersedia pada sesi SSH non-interaktif. GitHub Actions tidak memuat
profil shell interaktif aaPanel.

Buat user deployment khusus dan struktur direktori aplikasi:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo install -d -m 0755 -o deploy -g deploy /opt/apps/lims-medialab
sudo -u deploy install -d -m 0755 \
  /opt/apps/lims-medialab/releases \
  /opt/apps/lims-medialab/shared/uploads \
  /opt/apps/lims-medialab/shared/logs
```

Aktifkan PM2 saat server reboot:

```bash
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u deploy --hp /home/deploy
sudo -u deploy pm2 save
```

Jika instalasi Node Anda bukan di `/usr/bin`, gunakan path yang ditampilkan
oleh `command -v node` dan ikuti perintah `pm2 startup` yang dicetak oleh PM2.

## 2. Siapkan database dan environment produksi

Siapkan database MariaDB/MySQL kosong beserta user yang hanya memiliki akses ke
database aplikasi. Contoh di MariaDB lokal:

```sql
CREATE DATABASE lims_medialab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lims_user'@'127.0.0.1' IDENTIFIED BY 'PASSWORD_YANG_KUAT';
GRANT ALL PRIVILEGES ON lims_medialab.* TO 'lims_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Buat secret JWT, lalu buat file environment langsung di VPS. File ini tidak
pernah dikirim melalui GitHub Actions:

```bash
openssl rand -base64 48
sudo -u deploy nano /opt/apps/lims-medialab/shared/.env
sudo chmod 600 /opt/apps/lims-medialab/shared/.env
sudo chown deploy:deploy /opt/apps/lims-medialab/shared/.env
```

Isi file berdasarkan [`.env.example`](../.env.example). Nilai minimal yang
wajib benar adalah `DATABASE_URL` dan `JWT_SECRET`. Password database yang
mengandung karakter seperti `@`, `:`, `/`, atau `#` harus di-URL-encode.
`SHADOW_DATABASE_URL` tidak diperlukan di produksi.

Jangan menjalankan seed otomatis pada produksi. Jika data awal dari
`prisma/seed.ts` memang dibutuhkan, tinjau isinya terlebih dahulu dan jalankan
secara sadar setelah deployment pertama.

## 3. Buat SSH key GitHub Actions

Buat key khusus di komputer tepercaya, tanpa passphrase karena dipakai runner
non-interaktif:

```bash
ssh-keygen -t ed25519 -C "github-actions-lims" -f github-actions-lims
```

Tambahkan isi `github-actions-lims.pub` ke VPS:

```bash
sudo -u deploy install -d -m 0700 /home/deploy/.ssh
sudo -u deploy nano /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

Uji dari komputer tersebut sebelum melanjutkan:

```bash
ssh -i github-actions-lims -p 22 deploy@IP_VPS
```

Catat fingerprint key deployment dengan `ssh-keygen -lf github-actions-lims`
dan samakan dengan `VPS_DEPLOY_KEY_FINGERPRINT` pada workflow. Dengan demikian,
workflow berhenti lebih awal jika secret berisi key yang keliru atau rusak.

Lihat fingerprint host key langsung dari VPS:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Masukkan fingerprint terverifikasi tersebut pada nilai
`VPS_HOST_FINGERPRINT` di workflow. Runner mengambil public host key dengan
`ssh-keyscan` dan menolak koneksi jika fingerprint-nya berbeda. Pemeriksaan ini
mencegah runner terhubung ke server palsu tanpa memerlukan secret known-hosts.

## 4. Konfigurasi GitHub

Di repository GitHub, buka **Settings → Environments**, buat environment
bernama `production`, lalu batasi deployment ke branch `main`. Jika paket
GitHub Anda mendukungnya, tambahkan required reviewer untuk persetujuan manual.

Tambahkan secrets berikut sebagai environment secrets atau repository secrets:

| Nama | Isi |
| --- | --- |
| `VPS_HOST` | IP atau hostname VPS |
| `VPS_PORT` | Port SSH, biasanya `22` |
| `VPS_SSH_KEY` | Seluruh isi private key `github-actions-lims` |

Tambahkan variables berikut pada environment `production`:

| Nama | Isi |
| --- | --- |
| `DEPLOY_PATH` | Opsional; default `/opt/apps/lims-medialab` |
| `APP_URL` | URL publik, misalnya `https://lims.example.com` |
| `VPS_USER` | Opsional; default `deploy` |

Workflow hanya meminta izin `contents: read`. Kredensial database, JWT, dan
Ably tetap berada pada `/opt/apps/lims-medialab/shared/.env`, bukan di GitHub.

## 5. Konfigurasi Nginx atau aaPanel

Salin [`deploy/nginx.conf.example`](../deploy/nginx.conf.example), ganti
`YOUR_DOMAIN`, lalu aktifkan pada Nginx standar:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/lims-medialab
sudo sed -i 's/YOUR_DOMAIN/lims.example.com/g' /etc/nginx/sites-available/lims-medialab
sudo ln -s /etc/nginx/sites-available/lims-medialab /etc/nginx/sites-enabled/lims-medialab
sudo nginx -t
sudo systemctl reload nginx
```

Perintah `cp` di atas dijalankan dari checkout sementara di VPS. Alternatifnya,
tempel isi file melalui editor konfigurasi website aaPanel. Konfigurasi penting
yang harus tetap ada:

- reverse proxy ke `http://127.0.0.1:3001`;
- alias `/uploads/` ke `/opt/apps/lims-medialab/shared/uploads/`;
- `client_max_body_size 260M`;
- `proxy_request_buffering off` untuk upload streaming.

Aktifkan HTTPS melalui menu SSL aaPanel atau Certbot setelah DNS domain mengarah
ke VPS. Buka hanya port SSH, HTTP, dan HTTPS pada firewall; port `3001` tidak
perlu dibuka ke internet.

## 6. Deployment pertama

Commit dan push file CI/CD ke `main`, lalu pantau tab **Actions**. Workflow juga
bisa dijalankan dari **Run workflow**, tetapi hanya branch `main` yang boleh
masuk ke job deployment.

Sesudah selesai, verifikasi:

```bash
sudo -u deploy pm2 status
sudo -u deploy pm2 logs lims-medialab --lines 100
curl --fail http://127.0.0.1:3001/api/health
readlink -f /opt/apps/lims-medialab/current
```

Respons health check sehat berbentuk:

```json
{"status":"ok","version":"GIT_COMMIT_SHA"}
```

## Operasional dan rollback

Deployment menyimpan setiap release di `/opt/apps/lims-medialab/releases`.
Rollback kode otomatis terjadi jika health check gagal. Untuk rollback manual:

```bash
sudo -u deploy ln -sfn /opt/apps/lims-medialab/releases/SHA_LAMA \
  /opt/apps/lims-medialab/.current-manual
sudo -u deploy mv -Tf /opt/apps/lims-medialab/.current-manual \
  /opt/apps/lims-medialab/current
sudo -u deploy env APP_ROOT=/opt/apps/lims-medialab APP_VERSION=SHA_LAMA \
  pm2 startOrReload /opt/apps/lims-medialab/current/ecosystem.config.js --update-env
sudo -u deploy pm2 save
```

Rollback kode tidak membatalkan migrasi database. Karena itu, perubahan schema
produksi harus backward-compatible: tambahkan kolom/tabel terlebih dahulu,
deploy kode yang menggunakannya, dan hapus struktur lama pada release terpisah.
Backup database dan `shared/uploads` tetap wajib dijadwalkan di luar workflow.

Jika sebelumnya aplikasi dipasang langsung di `/opt/apps/lims-medialab`, pindah
atau arsipkan instalasi lama terlebih dahulu. Path
`/opt/apps/lims-medialab/current` harus kosong atau berupa symlink agar aktivasi
release aman.
