# Empat Environment di Satu VPS

Dokumen ini melengkapi `DEPLOYMENT.md`, yang menjelaskan pemasangan produksi.
Di sini yang dibahas adalah cara menambahkan environment kedua dan seterusnya
di VPS yang sama, agar pekerjaan marketing dan COA bisa direview lewat web
tanpa mengganggu produksi.

## Peta

| Branch | Environment | Port | App root | Database | PM2 |
|---|---|---|---|---|---|
| `main` | production | 3001 | `/opt/apps/lims-medialab` | `lims_medialab` | `lims-medialab` |
| `development` | development | 3002 | `/opt/apps/lims-medialab-development` | `lims_development` | `lims-medialab-development` |
| `marketing-dev` | marketing | 3003 | `/opt/apps/lims-medialab-marketing` | `lims_marketing` | `lims-medialab-marketing` |
| `coa-dev` | coa | 3004 | `/opt/apps/lims-medialab-coa` | `lims_coa` | `lims-medialab-coa` |

Push ke salah satu branch memicu deployment ke environment pasangannya.
Branch di luar daftar itu tidak akan ter-deploy — job `resolve` sengaja gagal
dengan pesan jelas alih-alih menebak tujuan.

## Isolasi

Yang **terpisah** per environment: database, `shared/.env`, direktori upload,
proses PM2, port, dan log.

Yang **dipakai bersama**: satu server MariaDB, satu instalasi Node/pnpm/PM2,
satu user Linux `deploy`, dan satu deploy key.

Alasan memilih database terpisah dan bukan VPS terpisah: migrasi Prisma dari
`marketing-dev` dan `coa-dev` akan saling menimpa kalau berbagi satu database,
sementara VPS terpisah menambah biaya tanpa menambah isolasi yang relevan di
tahap ini.

## Menambah environment

Dijalankan sebagai root **di VPS**:

```bash
cd /opt/apps/lims-medialab/current   # atau checkout repo mana pun

DB_PASSWORD="$(openssl rand -base64 32)" \
JWT_SECRET="$(openssl rand -base64 48)" \
  bash deploy/provision-environment.sh marketing
```

Script tersebut membuat direktori, database, user MariaDB, dan `shared/.env`
mode 600. Sifatnya idempoten — aman diulang, dan `shared/.env` yang sudah ada
tidak akan ditimpa.

Yang **tidak** dikerjakan script, dan memang disengaja: Nginx, DNS, SSL, dan
firewall tidak disentuh sama sekali. Langkah-langkah itu dicetak sebagai
instruksi di akhir eksekusi untuk Anda kerjakan manual.

Setelah subdomain aktif, push ke branch terkait. Deployment pertama akan
menjalankan `prisma migrate deploy` sendiri; seed dijalankan manual:

```bash
sudo -H -u deploy bash -lc \
  'cd /opt/apps/lims-medialab-marketing/current && pnpm db:seed'
```

## GitHub Environments

Buat tiga environment baru di **Settings → Environments**: `development`,
`marketing`, `coa`. Isi variable `APP_URL` masing-masing agar tautan
deployment muncul di halaman Actions.

Tidak ada secret tambahan yang perlu dibuat — VPS, port, dan deploy key sama
untuk semua environment, sedangkan kredensial database tinggal di
`shared/.env` milik tiap environment di VPS.

Pertimbangkan menyalakan **required reviewers** khusus pada environment
`production`, sehingga deployment ke marketing dan coa tetap lancar sementara
produksi butuh persetujuan.

## Penanda environment

`NEXT_PUBLIC_APP_ENV` di `shared/.env` memunculkan pita berwarna di atas
dashboard. Produksi tidak memilikinya, jadi layar tanpa pita berarti Anda
sedang berada di data sungguhan. Ini murah tetapi penting: empat situs ini
tampak identik.

## Menggabungkan kembali nanti

Saat pekerjaan marketing dan COA selesai, `marketing-dev` dan `coa-dev`
di-merge ke `development`. Satu-satunya konflik yang perlu diantisipasi adalah
folder `prisma/migrations/`: keduanya menambah file migrasi berbeda pada
riwayat yang sama.

Aturan mainnya, dan ini perlu disepakati dengan Abdan sejak awal:

1. Rebase ke `development` sesering mungkin, jangan menabung migrasi.
2. Jangan mengubah kolom pada model yang dipakai bersama — terutama
   `AnalysisParameter`. Menambah tabel baru yang mereferensikannya aman;
   mengubah kolomnya tidak.
3. Kalau butuh mengubah model bersama, sepakati dulu, lalu merge perubahan itu
   ke `development` lebih dahulu dan rebase kedua branch di atasnya.
