# Menyiapkan Pengembangan Lokal

Dokumen ini untuk developer yang baru mulai mengerjakan LIMS di laptopnya
sendiri. Untuk deployment ke VPS, lihat [ENVIRONMENTS.md](./ENVIRONMENTS.md).

## Ada dua jenis `.env`, dan sering tertukar

| | `.env` server | `.env` lokal |
|---|---|---|
| Lokasi | `/opt/apps/lims-medialab-<env>/shared/.env` di VPS | `.env` di root repo, di laptop Anda |
| Jumlah | satu per environment (production, development, marketing, coa) | satu per developer |
| Menunjuk ke | database di VPS | database di laptop Anda |
| Dibaca oleh | aplikasi yang berjalan di VPS | `pnpm dev` |
| Dibuat oleh | `deploy/provision-environment.sh` (sekali, oleh admin) | `scripts/setup-local-env.mjs` (oleh Anda) |

**Jangan pernah menyalin `.env` dari VPS ke laptop.** Alasannya bukan sekadar
formalitas keamanan:

1. Berkas itu berisi kredensial database server dan `JWT_SECRET`. Mengirimnya
   lewat chat berarti kredensial itu tersebar dan tidak bisa ditarik kembali.
2. Laptop Anda akan menulis **langsung ke database VPS**. Dua developer akan
   saling menimpa data, dan migrasi Prisma dari `coa-dev` dan `marketing-dev`
   akan bentrok di satu database — persis masalah yang kita hindari dengan
   memberi tiap branch database sendiri.
3. `JWT_SECRET` yang sama berarti token buatan laptop Anda berlaku di server.
4. `SUPPORT_UPLOAD_DIR` menunjuk path Linux yang tidak ada di Windows.

Tidak ada seorang pun yang perlu memegang `.env` VPS. Aplikasi di server
membacanya sendiri, dan CI/CD menautkannya otomatis saat deployment.

## Langkah setup

Prasyarat: Node 22+, pnpm 10.15.0, dan Docker Desktop.

```bash
pnpm install
node scripts/setup-local-env.mjs
```

Skrip itu membuat `.env` dengan `JWT_SECRET` acak khusus laptop Anda, lalu
mencetak perintah berikutnya. Ringkasnya:

```bash
# 1. Database lokal
docker run -d --name lims-dev-mariadb \
  -e MARIADB_ROOT_PASSWORD=root_dev_password \
  -e MARIADB_DATABASE=lims_dev \
  -e MARIADB_USER=lims_dev \
  -e MARIADB_PASSWORD=lims_dev_password \
  -p 3307:3306 mariadb:11.4

# 2. Tabel
pnpm exec prisma migrate deploy

# 3. Data awal — role, menu, akun demo, master matriks/regulasi
pnpm db:seed

# 4. Jalankan
pnpm dev
```

Akun demo tercetak di akhir langkah 3. Halaman login juga menampilkannya
selama `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="true"`.

Jika database sudah berisi akun dan data uji, tetapi master marketing perlu
disinkronkan ulang, gunakan seed terarah:

```bash
pnpm db:seed:marketing
```

Perintah ini hanya meng-upsert matriks, regulasi, parameter-regulasi, dan
durasi sampling. Perintah ini tidak membuat atau mereset user/password demo,
RBAC, customer, template COA, FAQ, maupun canned reply. Harga dasar yang belum
tersedia tetap dibiarkan kosong.

Port 3307 dipakai, bukan 3306, karena 3306 sering sudah terisi MySQL yang
terpasang langsung di Windows.

### Data uji yang lebih realistis

Master customer hasil seed hanya berisi dua baris. Untuk menguji pencarian
customer dengan kondisi menyerupai aslinya (ratusan data):

```bash
pnpm exec tsx scripts/seed-dummy-customers.ts          # tambah 600 customer
pnpm exec tsx scripts/seed-dummy-customers.ts --purge  # hapus lagi
```

## Membuat migrasi baru

`prisma migrate dev` memerlukan shadow database. Buat sekali:

```bash
docker exec lims-dev-mariadb mariadb -uroot -proot_dev_password \
  -e "CREATE DATABASE IF NOT EXISTS lims_dev_shadow;
      GRANT ALL PRIVILEGES ON lims_dev_shadow.* TO 'lims_dev'@'%';
      FLUSH PRIVILEGES;"
```

Lalu:

```bash
pnpm exec prisma migrate dev --name deskripsi_singkat
```

Deployment ke VPS memakai `prisma migrate deploy`, yang **tidak** memerlukan
shadow database — jadi langkah ini murni urusan lokal.

## Aturan main saat mengerjakan branch terpisah

`marketing-dev` dan `coa-dev` dikerjakan paralel lalu digabung di
`development`. Satu-satunya konflik yang perlu diantisipasi adalah folder
`prisma/migrations/`.

1. Rebase ke `development` sesering mungkin; jangan menabung migrasi.
2. **Jangan mengubah kolom pada model yang dipakai bersama** — terutama
   `AnalysisParameter`, yang dirujuk modul COA maupun marketing. Menambah
   tabel baru yang mereferensikannya aman; mengubah kolomnya tidak.
3. Bila memang harus mengubah model bersama, sepakati dulu, merge perubahan
   itu ke `development` lebih dahulu, lalu rebase kedua branch di atasnya.

## Pemeriksaan sebelum push

```bash
pnpm lint                 # harus 0 error
pnpm exec tsc --noEmit    # harus exit 0
pnpm check:workbook       # format Excel master data
```

CI menjalankan lint, migrasi, dan build. Kalau ketiganya lolos di lokal,
kecil kemungkinan CI merah.
