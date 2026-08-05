# Prompt Siap Tempel untuk Codex di VPS

Salin seluruh isi blok berikut ke Codex yang berjalan langsung di VPS.

```text
Anda adalah Codex yang berjalan langsung pada VPS produksi Ubuntu. Kerjakan
setup prerequisite deployment LIMS Medialab secara langsung dan verifikasi
hasilnya; jangan hanya memberi saya daftar perintah.

TUJUAN
Siapkan VPS agar GitHub Actions dapat deploy aplikasi sebagai user non-root
`deploy` ke `/opt/apps/lims-medialab`, menggunakan Node.js 22 system-wide,
pnpm 10.15.0, PM2, release directories, symlink `current`, dan port 3001.

OTORISASI
Saya mengizinkan Anda melakukan diagnosis read-only, memasang Node.js 22
system-wide, memasang pnpm 10.15.0 dan PM2 system-wide, memperbaiki ownership
path aplikasi yang disebutkan, serta mengaktifkan service PM2 untuk user
`deploy`. Gunakan hak root hanya untuk setup sistem; aplikasi harus berjalan
sebagai `deploy`.

FAKTA TERVERIFIKASI
- OS: Ubuntu 24.04.4 LTS x86_64.
- Hostname: host174779416976.
- App root: /opt/apps/lims-medialab.
- User aplikasi: deploy.
- Port aplikasi: 3001.
- Health endpoint: http://127.0.0.1:3001/api/health.
- /opt/apps/lims-medialab dimiliki deploy:deploy, mode 755.
- releases, shared/uploads, dan shared/logs sudah dibuat sebagai deploy:deploy.
- shared/.env sudah ada sebagai deploy:deploy dengan mode 600.
- current belum ada; ini benar untuk deployment pertama.
- curl, flock, dan rsync tersedia system-wide.
- node, pnpm, dan pm2 belum tersedia bagi user deploy.
- Root mempunyai Node dari NVM dan .npmrc yang konflik; jangan bergantung pada
  NVM root dan abaikan root .npmrc saat instalasi global.

BATAS KESELAMATAN
- Jangan pernah menampilkan isi .env, DATABASE_URL, JWT_SECRET, API key,
  password, atau private SSH key.
- Jangan salin private SSH key ke VPS.
- Jangan menjalankan aplikasi sebagai root.
- Jangan menggunakan chmod 777.
- Jangan menjalankan prisma migrate reset, db push, atau seed produksi.
- Jangan mengubah database, Nginx/aaPanel, DNS, SSL, atau firewall.
- Jangan menghapus atau memindahkan instalasi/release lama.
- Jika port 3001 sedang dipakai, identifikasi prosesnya tetapi JANGAN hentikan,
  restart, atau kill proses tersebut tanpa meminta konfirmasi saya. Itu mungkin
  aplikasi produksi aktif.
- Jika menemukan kondisi di luar scope ini, berhenti dan laporkan bukti.

LANGKAH KERJA
1. Audit OS, user deploy, ownership/mode app root, releases, shared, dan
   shared/.env. Periksa keberadaan nama variable DATABASE_URL dan JWT_SECRET
   dengan grep -q tanpa mencetak nilainya. Periksa current dan port 3001.
2. Jika Node system-wide belum tersedia, unduh setup NodeSource 22 ke
   /tmp/nodesource_setup_22.sh, jalankan script tersebut, lalu apt-get install
   -y nodejs. Gunakan /usr/bin/node dan /usr/bin/npm untuk verifikasi.
3. Instal global tools dengan perintah ekuivalen:
   NPM_CONFIG_USERCONFIG=/dev/null /usr/bin/npm install --global
   pnpm@10.15.0 pm2@latest
4. Verifikasi node, pnpm, pm2, curl, flock, dan rsync dalam konteks login user
   deploy, bukan hanya sebagai root.
5. Aktifkan PM2 systemd startup untuk user deploy menggunakan binary
   system-wide /usr/bin/pm2, jalankan pm2 save sebagai deploy, lalu periksa
   status pm2-deploy.
6. Audit pemakai port 3001, proses Next.js, PM2 root, dan PM2 deploy. Jika port
   bebas, nyatakan aman untuk rerun GitHub Actions. Jika port dipakai, jangan
   hentikan; laporkan PID, user, command, dan process manager serta usulkan
   cutover aman.
7. Jangan menjalankan migrasi atau deployment aplikasi manual pada tahap ini.
   Tugas ini hanya menyiapkan VPS agar workflow GitHub Actions dapat dilanjutkan.

KRITERIA SELESAI
- deploy dapat menulis /opt/apps/lims-medialab.
- shared/.env owner deploy:deploy mode 600 dan nama variable wajib tersedia.
- node sebagai deploy adalah v22.x.
- pnpm sebagai deploy adalah 10.15.0.
- pm2 sebagai deploy dapat dijalankan.
- service pm2-deploy aktif/enabled.
- current tidak berupa direktori biasa.
- status port 3001 sudah diketahui.
- tidak ada secret yang tampil dalam output.

GAYA EKSEKUSI DAN LAPORAN
Jalankan langkah aman secara mandiri. Setelah selesai, laporkan secara ringkas:
(1) perubahan yang dibuat, (2) versi dan path binary, (3) status permission dan
PM2, (4) status port 3001, (5) apakah VPS siap untuk rerun GitHub Actions, dan
(6) blocker yang masih ada. Sertakan output bukti yang tidak sensitif. Jangan
meminta saya menyalin banyak perintah jika Anda dapat mengeksekusinya sendiri.
```
