# Handoff AI Claude — Status Proyek LIMS Medialab

Terakhir diverifikasi: **12 Agustus 2026 (WIB)**
Branch aktif: **`marketing-dev`**  
Commit sebelumnya: **`dab0424` — `feat: resend email vendor`**

Perubahan terakhir: antarmuka branch `marketing-dev` diseragamkan menjadi
workspace enterprise yang ringkas berdasarkan referensi visual pemilik produk.
Shell, navigasi, header, motion, surface, status, lead/survey, quotation, dialog
operasional, dan halaman lintas departemen kini mengikuti satu sistem desain.
Aturan bisnis, permission, status, dan kontrak API tidak diubah.

Dokumen ini adalah titik masuk utama untuk AI Claude atau developer berikutnya.
Tujuannya membedakan secara tegas antara fitur yang sudah ada di kode, fitur
yang baru sebagian selesai, pekerjaan yang belum dimulai, dan keputusan yang
memang harus datang dari tim bisnis Medialab.

Dokumen ini **bukan persetujuan bisnis** atas isi quotation, harga, rekening,
nomor dokumen, atau kebijakan laboratorium. Jangan menyatakan aplikasi siap
untuk customer nyata hanya karena build dan health check berhasil.

## 1. Cara membaca konteks proyek

Baca dokumen dalam urutan berikut:

1. Dokumen ini untuk status terakhir dan urutan kerja berikutnya.
2. [`marketing/QUOTATION-OFFICIAL-TEMPLATE-AUDIT.md`](./marketing/QUOTATION-OFFICIAL-TEMPLATE-AUDIT.md)
   untuk hasil audit file XLSM/PDF dari Mba Lia.
3. [`marketing/MENU-PENGUJIAN-2024-AUDIT.md`](./marketing/MENU-PENGUJIAN-2024-AUDIT.md)
   untuk aturan konversi katalog pengujian.
4. [`DEVELOPMENT.md`](./DEVELOPMENT.md) untuk setup lokal dan perintah validasi.
5. [`ENVIRONMENTS.md`](./ENVIRONMENTS.md) dan [`DEPLOYMENT.md`](./DEPLOYMENT.md)
   untuk environment, deployment, migration, dan seed.

[`marketing/QUOTATION-REDESIGN.md`](./marketing/QUOTATION-REDESIGN.md) adalah
dokumen desain awal. Sebagian asumsinya sudah digantikan audit template resmi,
terutama tentang harga paket, qty manual, multi-regulasi, dan biaya tambahan.

## 2. Ringkasan kondisi saat handoff

| Area | Status | Bukti/keterangan |
| --- | --- | --- |
| Git lokal | Redesign UI belum di-commit | Perubahan sistem desain 12 Agustus 2026 masih berada di working tree. `.claude/settings.local.json` tetap merupakan konfigurasi lokal pengguna dan tidak disentuh. |
| Sinkronisasi branch | Sinkron dengan remote | `HEAD` dan `origin/marketing-dev` sama-sama `dab0424`. |
| VPS marketing | Sehat | `/opt/apps/lims-medialab-marketing/current` menunjuk commit `dab0424`; health port `3012` mengembalikan `status: ok`. |
| Database marketing | Mutakhir | Database `lims_marketing` memiliki 16 migration dan `prisma migrate status` menyatakan up to date. |
| Database lokal | Mutakhir | `.env` lokal menunjuk `lims_e2e` pada `127.0.0.1:3307`; 16 migration sudah diterapkan. |
| Build | Lulus | `corepack pnpm build` berhasil pada 12 Agustus 2026 untuk 81 halaman; tetap ada satu warning tracing Turbopack dari route upload support. |
| TypeScript | Lulus | `corepack pnpm exec tsc --noEmit` exit 0. |
| ESLint | Lulus dengan utang teknis | 0 error, 121 warning. Sebagian besar adalah React hook warning, `no-explicit-any`, dan `alt-text` pada kode export/support lama. |
| Pemeriksaan workbook | Perlu diulang di Node 22 | `check:workbook` gagal sebelum membaca workbook karena `tsx`/Windows memunculkan `uv_os_get_passwd ENOMEM` pada Node 24.19.0. Ini bukan bukti workbook rusak. Pemeriksaan langsung dengan ExcelJS berhasil membaca workbook. |
| Resend | Koneksi dasar berhasil | API key yang sudah dirotasi berhasil dipakai untuk satu email uji; Resend menerima request dan memberi message ID. Ini belum sama dengan UAT kirim quotation dari UI. |
| Konfigurasi email/dokumen marketing | Nama variabel wajib terisi | Pemeriksaan hanya melaporkan `set/missing`, tanpa membaca nilai. `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, sembilan variabel dokumen yang diwajibkan route, dan `QUOTATION_MINIMUM_ORDER` terdeteksi terisi. Nilainya tetap harus divalidasi manusia; phone/fax/website bersifat opsional dan tidak diperiksa. |

Catatan integrasi Git: `marketing-dev` saat ini mempunyai delapan commit yang
belum ada di `development`, sedangkan `development` mempunyai satu commit yang
belum ada di `marketing-dev`. Jangan merge buta. Fetch lalu rebase/merge dengan
meninjau khusus konflik pada `prisma/schema.prisma`, `prisma/migrations/`, seed,
dan file bersama dengan branch `coa-dev`.

## 3. Sasaran bisnis yang sedang diwujudkan

Alur yang diminta Mba Lia adalah:

1. CS menerima kontak customer, menanyakan jenis pengujian, memastikan Medialab
   mampu mengerjakannya, dan melengkapi identitas perusahaan/PIC/email/telepon.
2. Jika customer sudah memahami scope dan parameter, lead dapat langsung menjadi
   dasar quotation.
3. Jika scope belum jelas, CS merekomendasikan survey dan memilih pelaksana sesuai
   kebutuhan. Hasilnya adalah **Resume Survey** berisi parameter yang menjadi
   dasar quotation.
4. Customer dibedakan menjadi:
   - Direct Customer: `DC.001.YYxxxxx`, contoh `DC.001.2600001`.
   - Consultant Customer: `CC.001.YYCCCxxxxx`, dengan `CCC` ID konsultan tiga
     digit, contoh `CC.001.2602100001`.
5. TAT yang dipakai dari meeting terbaru:
   - Normal: 10 hari kerja, harga standar.
   - Urgent: 7 hari kerja, tambahan 30% pada jasa pengujian.
   - Top Urgent: 5 hari kerja, tambahan 50% pada jasa pengujian.
6. Regulasi pemerintah tampil ringkas. Ketika dibuka, parameter dan durasi/jam
   tampil dengan animasi expand/collapse `ease-in-out`.
7. Tahapan komersial adalah Lead → Quotation → Purchase Order.
8. Setelah quotation diverifikasi dan di-approve, sales meninjau serta boleh
   mengedit draft email. Tombol Send mengirim email beserta lampiran otomatis.
9. Form pembuatan quotation harus berupa halaman sendiri yang lega, bukan modal.
   Sidebar desktop harus dapat diringkas dan diperluas.

Alur status kode saat ini secara ringkas:

`Lead → Survey opsional → REQUESTED → VERIFIED → APPROVED → SENT → CONFIRMED → PO_UPLOADED → LTR_CREATED → COC_CREATED → Sample/Lab → COA → Invoice`

## 4. Yang sudah selesai

### 4.0 Sistem UI enterprise lintas aplikasi

- Acuan implementasi ada di [`UI-DESIGN-SYSTEM.md`](./UI-DESIGN-SYSTEM.md).
- Sidebar putih dapat diringkas, memiliki mobile drawer, active state yang jelas,
  dan mempertahankan menu sesuai RBAC.
- Topbar global menyediakan breadcrumb, command search `Ctrl/Cmd + K`, akses
  notifikasi, profil, dan logout.
- Canvas, border, radius, focus state, table, card, status badge, header halaman,
  dan motion dipadatkan agar sesuai referensi operasional.
- Lead dan survey memakai pola queue-detail; pembuatan lead, rekomendasi survey,
  dan Resume Survey memakai dialog aplikasi yang responsif.
- Quotation memakai progress tahap yang jelas dan editor grup yang ringkas.
- Form Buat Quotation memakai satu kolom kerja dan sticky running summary,
  dengan tahap Tujuan, Ruang Lingkup, dan Komersial. Browser UAT lokal berhasil
  melewati pemilihan customer sampai tahap komersial pada desktop dan mobile
  tanpa overflow horizontal atau runtime error.
- Browser `prompt` dan `alert` pada alur operasional telah diganti dengan dialog
  atau pesan inline aplikasi tanpa mengubah endpoint maupun payload bisnis.
- Login serta header halaman Admin, Audit, Finance, Lab, Master, Sales, dan
  Technical sudah diselaraskan. Compatibility layer global menjaga layar lama
  tetap memiliki rasa visual yang sama selama refactor komponen berikutnya.

### 4.1 Katalog MENU PENGUJIAN 2024 — satu-satunya sumber

Menurut Marketing, **menu pengujian adalah seluruh layanan yang Medialab bisa
tawarkan**. Karena itu `MENU PENGUJIAN 2024.xlsx` sekarang menjadi satu-satunya
asal matriks, regulasi, parameter, dan durasi. Tidak ada katalog lain yang boleh
hidup berdampingan dengannya.

- Converter membaca sheet `Database`, `Database UE`, dan `Parameter Lainnya`.
- Berkas turunan ada di
  [`generated/master-marketing-menu-2024.xlsx`](./generated/master-marketing-menu-2024.xlsx),
  dengan sheet `Petunjuk`, `Matriks`, `Regulasi`, `Parameter`, `Audit Sumber`,
  dan `Review Akreditasi`.
- Hasil konversi terakhir (11 Agustus 2026):
  - 3.151 baris sumber, 3.149 valid, 10 duplikat persis dilewati;
  - 29 node matriks/subject;
  - 293 regulasi;
  - 3.005 relasi parameter-regulasi;
  - 2 baris tidak lengkap disisihkan;
  - 6 ejaan digabung karena hanya berbeda huruf besar/kecil;
  - 184 parameter perlu review penanda akreditasi.
- Pengisian database memakai `pnpm db:sync:menu-pengujian`. Aman diulang, dan
  membuat isi database sama persis dengan berkas.
- Harga dasar tetap `null`; berkas sumber tidak memiliki price list. Jangan
  mengubah nilai kosong menjadi nol dan jangan mengarang harga.

Keputusan yang diambil pada 11 Agustus 2026 dan tidak boleh dibalik tanpa
membicarakannya lagi dengan pemilik produk:

1. Katalog lama hasil seed dari surat Rev.07 **dihapus**, bukan dinonaktifkan.
   `prisma/seed-marketing-master.ts` dan `prisma/seed-marketing.ts` sudah
   dihapus, dan `prisma/seed.ts` tidak lagi menanam katalog.
2. Nama matriks dan regulasi dipakai **apa adanya dalam bahasa Inggris** seperti
   berkas sumber. Label durasi memakai Bahasa Indonesia karena satu durasi
   ditulis dengan beberapa ejaan di sumbernya sehingga harus dipilih satu bentuk
   baku, dan Bahasa Indonesia sama dengan surat penawaran.
3. Kode matriks/regulasi kini terbaca manusia, mis.
   `AMBIENT_AIR_QUALITY_ANALYSIS.OUTDOOR_AMBIENT_AIR_QUALITY`. Sebelumnya berupa
   hash seperti `MTX_SURFACE_WATER_QUALITY_ANALYSIS_WELL_WATER_LAKE_W_9E1AD98`.
4. Node yang hanya berbeda huruf besar/kecil digabung. Node yang namanya
   benar-benar berbeda tetap terpisah walau isinya mirip.
5. Parameter yang penanda `*`-nya tidak konsisten diperlakukan **belum
   terakreditasi**, dan daftarnya ada di sheet `Review Akreditasi`. Kolom
   `Status Akreditasi` pada sheet `Database UE` dianggap lebih sahih daripada
   tebakan dari tanda bintang.

#### Mengapa form quotation sempat menampilkan katalog usang

Ini bukan kegagalan import. Penyebabnya dua hal yang berbeda per environment:

- **Database lokal** berisi katalog baru DAN katalog lama sekaligus. Nama lama
  yang berbahasa Indonesia (`Udara → Udara Ambien`, 2 regulasi) tampil lebih
  dulu dan menutupi node resmi yang setara (`Ambient Air Quality Analysis →
  Outdoor Ambient Air Quality`, 25 regulasi).
- **Database marketing di VPS** belum pernah menerima katalog resmi sama sekali:
  hanya 17 matriks, 9 regulasi, dan 27 parameter hasil seed lama.

Kalau gejala ini muncul lagi, periksa lebih dulu apakah
`pnpm db:sync:menu-pengujian` sudah dijalankan pada environment yang benar —
bukan hanya pada database lokal.

### 4.1.1 Satu parameter, beberapa metode uji

Migration `20260811210000_regulation_parameter_method_variant` menambahkan kolom
`RegulationParameter.variantKey` dan mengubah kunci unik menjadi
`(regulationId, parameterId, variantKey)`.

Alasannya: sumber menawarkan parameter yang sama dengan metode uji berbeda di
dalam regulasi yang sama — NO2 pada PP 22/2021 tersedia lewat SNI 19-7119.2-2005
maupun MASA 408, dan SO2 punya tiga varian. Dengan kunci unik lama, varian kedua
dan seterusnya saling menimpa sehingga **331 layanan yang benar-benar bisa
dikerjakan Medialab tidak pernah muncul** di form quotation (3.005 baris sumber
hanya menjadi 2.674 baris database).

`variantKey` dihitung dari metode dan satuan lewat
`regulationParameterVariantKey()` di `src/lib/marketing-master-workbook.ts`.
Baris lama bernilai string kosong, sehingga migration ini tidak mengubah maupun
menghapus data yang sudah ada.

### 4.1.2 Master durasi sampling

Kolom `SAMPLING METHOD` pada berkas sumber mencampur dua hal: lamanya
pengambilan contoh uji (`8 hours`, `24 jam`, `Grab`) dan caranya
(`Isokinetik (APEX)`, `SNI 8990:2021`). Konversi terdahulu memasukkan semuanya
ke master durasi, sehingga tabel `SamplingDuration` berisi 33 baris — metode
sampling ikut masuk, dan satuan waktu yang sama tercatat berkali-kali dengan
ejaan berbeda.

Aturan pemisahannya sekarang terpusat di `src/lib/sampling-duration-catalog.ts`.
Hasilnya 8 durasi baku (Grab, 1/3/8/24 Jam, 30/90 Hari, 1 Tahun), sementara
metode sampling pindah ke kolom `RegulationParameter.samplingMethod` yang memang
sudah ada. Penyaring yang sama dipasang di script sync, sehingga berkas Excel
suntingan manual tidak bisa mengotori master durasi lagi.

### 4.2 Customer direct dan consultant

- Model `Consultant` tersedia dengan kode tiga digit dan dapat memiliki banyak
  tenant/client.
- Master customer mendukung tipe direct/consultant serta relasi konsultan.
- Generator kode `DC` dan `CC` sudah mengikuti format meeting dan menangani
  tabrakan nomor dengan retry unique constraint.
- Data customer mencakup alamat customer, billing, lokasi sampling, pengiriman
  dokumen, PIC, telepon, dan sampai empat email penerima.
- Halaman master customer dan endpoint quick-create telah diperluas untuk data
  tersebut.

### 4.3 Master marketing dan tampilan regulasi

- Pohon matriks berkedalaman bebas tersedia.
- Regulasi, parameter per regulasi, metode, unit, baku mutu, durasi yang sah,
  sampling method, sample matrix, sample size, harga dasar, dan status
  akreditasi sudah dimodelkan.
- Regulasi dapat dibuka/tutup dan menampilkan parameter serta durasi dengan
  animasi `AnimatePresence`/`motion` dan `easeInOut`.
- Parameter tidak terakreditasi ditandai `*` pada master dan dokumen.

### 4.4 Halaman dan UX quotation

- Pembuatan quotation baru berada di route
  `/quotations/request/new`, bukan modal di dalam halaman daftar.
- Form memakai presentasi halaman penuh dan dapat menerima `leadId` serta
  `customerId` dari halaman Lead & Survey.
- Sidebar desktop dapat collapse/expand, lebar konten ikut berubah, dan pilihan
  disimpan di `localStorage`.
- Form quotation menggunakan wizard detail → grup parameter → ringkasan.
- Pencarian customer dan quick-create tersedia bagi role yang berizin.

### 4.5 Struktur dan perhitungan quotation resmi

- Satu `QuotationGroup` mewakili satu paket pengujian.
- Satu grup mendukung banyak regulasi, banyak parameter, banyak lokasi, qty
  komersial manual, harga paket, base price, dan catatan.
- `QuotationGroupPricingMode` membedakan quotation lama dengan harga per item
  (`ITEM`) dari format resmi baru dengan harga paket (`PACKAGE`). Ini mencegah
  harga parameter lama bocor atau PDF/Excel menafsirkan `null` secara berbeda.
- Urutan parameter disimpan eksplisit melalui `QuotationItem.sort`.
- Biaya sampling, dokumen, dan biaya lain menjadi baris
  `QuotationChargeItem`, bukan satu angka tanpa rincian.
- Diskon mempunyai nilai dan label eksplisit.
- PPN dan grand total dihitung dari snapshot quotation.
- Gerbang harga mengizinkan draft `UNPRICED`/`PARTIAL`, tetapi approval hanya
  boleh jika seluruh paket dan biaya yang wajib sudah berharga.
- TAT 10/7/5 dan multiplier 1/1,3/1,5 sudah terpusat di
  `src/lib/tat-policy.ts`. Surcharge hanya mengenai jasa pengujian, bukan biaya
  sampling.

### 4.6 PDF dan Excel quotation

- PDF dan Excel telah disusun ulang menjadi surat penawaran Bahasa Indonesia,
  A4 portrait, mengikuti struktur Rev.07 sebagai referensi visual.
- Dokumen memuat customer dan billing, nomor/tanggal/masa berlaku, tabel paket,
  regulasi, lokasi, parameter, metode, durasi, qty, harga, biaya tambahan,
  diskon, TAT, PPN, total, alamat sampling, pengiriman dokumen, penerima email,
  syarat, dan tiga peran penandatangan.
- Harga kosong dicetak sebagai em dash, bukan `Rp0`.
- Excel memakai nomor halaman dinamis. PDF memakai footer dokumen terkendali
  statis karena page count React PDF belum stabil pada tabel auto-paginated.
- PDF dan Excel membaca konfigurasi perusahaan/rekening/form dari
  `src/lib/exports/quotation-document-config.ts`.
- Data, rekening, nama staf, tanda tangan, dan harga milik `PT CONTOH` tidak
  disalin ke aplikasi. File contoh hanya acuan struktur.

### 4.7 Workflow, RBAC, revisi, dan email

- Lead, capability, survey, resume, dan parameter resume telah memiliki model
  serta API.
- Workflow quotation tetap memerlukan tahap verifikasi dan approval; RBAC tidak
  boleh diubah sampai tidak ada role yang memegang langkah wajib.
- Audit revision menangkap perubahan/status quotation.
- Setelah `APPROVED`, sales dapat membuka, mengedit, dan menyimpan draft email.
- Saat Send ditekan, server membuat PDF terbaru serta lampiran identitas customer.
- Route pengiriman mempunyai:
  - pemeriksaan konfigurasi provider dan dokumen sebelum claim;
  - validasi email, subject, CC, dan ukuran body;
  - atomic claim untuk draft;
  - lease quotation untuk mencegah dua tab mengirim draft berbeda bersamaan;
  - idempotency fingerprint berdasarkan quotation, customer, email, dan isi
    attachment;
  - timeout provider 20 detik;
  - status `DRAFT/SENDING/SENT/FAILED`, message ID provider, error terakhir,
    manifest attachment, dan audit log.
- Pengiriman aplikasi memakai REST API Resend di `src/lib/email-delivery.ts`.
  Paket SDK `resend` dipakai oleh `scripts/test-resend-email.ts` untuk tes
  koneksi sederhana; jangan mengganti jalur produksi hanya agar sama dengan
  script contoh.
- Tombol Send dinonaktifkan dan menjelaskan variabel yang hilang bila provider
  atau identitas dokumen belum siap.

### 4.8 Deployment aman

- Branch dipetakan ke environment terpisah dengan database, `.env`, upload,
  port, PM2, dan app root masing-masing.
- Deployment membangun aplikasi, menjalankan `prisma migrate deploy`, mengganti
  symlink release secara atomik, health check, dan rollback kode bila gagal.
- Full seed tidak lagi otomatis. Ia hanya berjalan pada non-production jika
  `RUN_FULL_SEED_ON_DEPLOY=true`, dengan tiga guard produksi.
- `pnpm db:seed:marketing` hanya menyinkronkan master marketing dan tidak
  mereset password demo, RBAC, FAQ, atau data UAT.
- Migration resmi menambahkan menu dan permission marketing secara aman agar
  fitur tidak bergantung pada full seed di production.

## 5. Yang masih setengah selesai

### 5.1 Intake customer oleh CS

Lead sudah mewajibkan customer, nama kontak, email, telepon, kebutuhan uji, dan
status kemampuan. Namun alur belum sepenuhnya memenuhi kebutuhan operasional:

- role `CUSTOMER_SERVICE` dapat membuat/mengubah lead, tetapi secara default
  tidak mendapat menu/izin `master.customers`;
- CS belum mempunyai quick-create customer yang terintegrasi langsung di form
  lead;
- API lead belum mengunci kelengkapan seluruh identitas master customer seperti
  company, alamat, billing, dan data pengiriman;
- status “Medialab mampu” masih keputusan manual, belum dibantu pencocokan scope
  terhadap katalog pengujian.

Keputusan yang dibutuhkan: apakah CS boleh membuat/mengubah master customer,
atau harus ada form intake terbatas yang kemudian diverifikasi Sales/Admin.

### 5.2 Lead dan Resume Survey ke quotation

Backend survey dapat menyimpan pelaksana, jadwal, ringkasan, URL resume, dan
snapshot parameter. Lead otomatis menjadi `READY_FOR_QUOTATION` saat resume
siap. Namun:

- UI survey masih memakai `window.prompt`, termasuk daftar parameter yang
  diketik sebagai teks dipisahkan koma;
- belum ada editor resume yang memilih regulasi/parameter langsung dari master;
- `resumeFileUrl` didukung API tetapi belum mempunyai upload file fisik;
- halaman quotation dari lead hanya mem-prefill customer dan teks kebutuhan;
  parameter Resume Survey belum otomatis menjadi grup/regulasi/parameter
  quotation.

Jadi hubungan data sudah ada, tetapi Resume Survey belum benar-benar menjadi
dasar quotation secara otomatis seperti permintaan bisnis.

### 5.3 Master data di environment marketing

Selesai dan terverifikasi pada 11 Agustus 2026 di **kedua** environment. Isinya
sama persis dengan berkas sumber: **29 matriks, 293 regulasi, 3.005 parameter,
8 durasi**, dengan 11 kategori utama dan tidak ada lagi cabang
`Udara`/`Lingkungan Kerja`/`Air` bawaan seed lama.

| | Lokal `lims_e2e` | VPS `lims_marketing` |
| --- | --- | --- |
| Katalog | 29 / 293 / 3.005 / 8 | 29 / 293 / 3.005 / 8 |
| Dihapus saat sync | 47 matriks, 302 regulasi | 17 matriks, 9 regulasi |
| Quotation setelah sync | 28 quotation, 83 baris | 2 quotation, 12 baris |

Menjalankan script sync dua kali berturut-turut di database lokal tidak membuat
maupun menghapus apa pun, jadi sifat "aman diulang" sudah terbukti, bukan hanya
diklaim. Health check `lims-medialab-marketing` mengembalikan `status: ok` pada
commit `087656d` setelah sync.

Yang masih kurang di katalog: harga paket/base price resmi belum ada dari
sumber. Quotation dapat disusun, tetapi tidak dapat di-approve sebelum harga
komersialnya lengkap.

Harga paket/base price resmi belum tersedia dari sumber. Quotation dapat disusun,
tetapi tidak dapat di-approve sebelum harga komersialnya lengkap.

### 5.4 Email produksi

Kredensial dan seluruh nama konfigurasi wajib terdeteksi terisi di VPS marketing.
Satu email sederhana sudah diterima API Resend menggunakan sender uji. Yang belum
selesai adalah UAT melalui aplikasi:

1. buat quotation berharga lengkap;
2. verifikasi dan approve menggunakan role yang benar;
3. review/edit draft sebagai sales;
4. kirim ke alamat internal yang diizinkan;
5. periksa attachment PDF dan identitas;
6. pastikan status menjadi `SENT`, message ID tersimpan, dan tidak terkirim dua
   kali saat double-click/dua tab;
7. periksa Inbox/Spam serta pastikan `MAIL_FROM` memakai domain yang benar-benar
   verified di Resend.

Status `SENT` saat ini berarti Resend menerima request, bukan bukti email masuk
ke inbox. Webhook delivered/bounced belum ada.

### 5.5 Kesesuaian dokumen resmi

Struktur PDF/Excel sudah jauh lebih dekat ke contoh resmi, tetapi hasil akhir
masih memerlukan review visual Mba Lia/Marketing. Konfigurasi legal sudah terisi
secara teknis, tetapi nilainya tidak dicatat di repo dan belum dinyatakan benar
oleh Finance/Manajemen dalam handoff ini.

Syarat quotation masih dibentuk dari default generator ditambah field teks,
belum berupa master syarat yang versioned dan disnapshot per quotation. Perubahan
default di masa depan berpotensi mengubah hasil regenerasi dokumen lama.

### 5.6 Penomoran dan masa berlaku

Kode sekarang masih memakai keluarga `ML-YY-NNNN-QT-Rn`, sedangkan contoh Mba Lia
memakai `MI.QT.001.26030811.REV1`. Satu contoh tidak cukup untuk menyimpulkan
arti segmen `26030811`, sehingga kode tidak boleh diubah dengan tebakan.

Default `validUntil` di UI masih tanggal quotation +30 hari. Contoh XLSM memakai
7 hari kalender. Nilai ini menunggu keputusan Marketing.

### 5.7 Pembagian role verifikasi dan approval

Implementasi default saat ini membagi tugas:

- `SALES_STAFF`: verifikasi quotation (`REQUESTED → VERIFIED`);
- `SALES_MANAGER_DIRECTOR`: approve (`VERIFIED → APPROVED`).

Brief awal dapat dibaca bahwa manager melakukan verifikasi sekaligus approval.
Mba Lia/Manager Marketing harus memastikan pembagian yang benar. Jika manager
harus melakukan kedua langkah, ubah permission seed/migration/RBAC secara sadar
tanpa menghapus tahap wajib dari workflow.

## 6. Yang belum dikerjakan

| Prioritas | Pekerjaan | Pemilik utama | Kriteria selesai |
| --- | --- | --- | --- |
| P0 | Konfirmasi formula nomor quotation resmi | Mba Lia / Marketing, lalu Developer | Arti setiap segmen dan aturan revisi tertulis; generator, migration/backfill, PDF, Excel, dan dokumen turunan konsisten. |
| P0 | Putuskan masa berlaku 7 atau 30 hari | Mba Lia / Marketing | Default UI dan terms dokumen memakai keputusan yang sama. |
| P0 | Sediakan dan sahkan price list | Marketing + Finance | Harga paket/base price resmi masuk master; contoh PT CONTOH tidak dipakai; approval quotation nyata dapat lolos. |
| P0 | Review data sumber yang meragukan | Mba Lia + Teknis | 2 baris tidak lengkap dan 184 parameter pada sheet `Review Akreditasi` diputuskan, lalu `pnpm convert:menu-pengujian` dan `pnpm db:sync:menu-pengujian` dijalankan ulang. Sementara ini yang ambigu ditandai belum terakreditasi. |
| P0 | Sambungkan Resume Survey ke grup quotation | Developer, divalidasi Technical/Sales | Klik “Buat Quotation” membawa grup, regulasi, parameter, metode, durasi, dan lokasi dari resume tanpa ketik ulang. |
| P0 | Selesaikan hak dan UI intake customer CS | Mba Lia menentukan ownership; Developer menerapkan | CS dapat mendaftarkan/melengkapi identitas yang diwajibkan tanpa mendapat akses master berlebihan. |
| P0 | UAT lima peran pada environment marketing | CS, Sales, Manager, Technical, perwakilan Customer; IT mendampingi | Skenario lead langsung, lead survey, quotation priced/unpriced, verify, approve, send, confirm, PO, LTR, dan COC terdokumentasi lulus/gagal. |
| P0 | UAT email quotation nyata dari UI | Sales + IT | Email dari sender resmi diterima alamat internal; PDF benar; audit/status benar; retry/double-click tidak menggandakan kirim. |
| P0 sebelum merge | Integrasikan `development` dan `marketing-dev` dengan aman | Developer | Commit yang tertinggal direbase/merge, migration dari `coa-dev` tidak bentrok, build dan UAT ulang lulus. |
| P1 | Kalender hari libur perusahaan | Mba Lia/Technical memberi kalender; Developer membuat master | TAT menghitung Senin–Jumat dan hari libur perusahaan, dengan snapshot kebijakan. |
| P1 | Upload fisik Resume Survey dan PO | Developer/IT | File disimpan pada storage yang disetujui, tervalidasi tipe/ukuran/otorisasi, bukan hanya URL manual. |
| P1 | Webhook Resend delivery/bounce | Developer/IT | Provider event tervalidasi signature-nya dan status delivery/bounce tercatat terpisah dari `SENT`. |
| P1 | Syarat quotation yang versioned | Marketing/Legal + Developer | Versi syarat disetujui dan disnapshot agar dokumen lama tidak berubah saat policy baru diterbitkan. |
| P1 | Tanda tangan/QR approval | Manajemen menentukan bentuk; Developer menerapkan | Aset, hak akses, audit, dan posisi dokumen disepakati; tidak mengambil image dari PT CONTOH. |
| P1 | Automated test | Developer | Ada test untuk customer code, pricing/TAT, legacy/package mode, totals, workflow, email idempotency, dan generator PDF/Excel. Saat ini belum ada test suite formal. |
| P1 | Kurangi warning dan tracing build | Developer | Warning React hooks/a11y/`any` ditangani bertahap dan warning Turbopack route upload tidak lagi men-trace proyek secara luas. |
| P2 | Samakan form COC/STPS/Invoice dengan format resmi Medialab | Mba Lia/Technical/Finance + Developer | Masing-masing mempunyai template resmi yang bersih dan keputusan field; jangan meniru sheet legacy/rusak dari file contoh. |
| P2 | Nomor halaman PDF dinamis | Developer | Footer PDF menampilkan halaman x/y secara stabil tanpa merusak auto-pagination tabel. |

## 7. Keputusan bisnis yang tidak boleh ditebak AI

Claude harus berhenti dan meminta keputusan manusia jika pekerjaan menyentuh:

- formula nomor `MI.QT...` dan format revisi `.REV1`;
- masa berlaku quotation;
- konflik TAT: meeting terbaru 10/7/5, terms contoh menyebut 14 hari, dan COC
  lama pernah mempunyai tier 10/7/5/3;
- harga paket, diskon, minimum order, PPN, atau payment term resmi;
- status akreditasi pada 192 baris yang tidak konsisten;
- data legal perusahaan, rekening, sender email resmi, tanda tangan, dan QR;
- role mana yang memverifikasi versus meng-approve;
- kalender hari libur dan titik awal perhitungan estimated CoA;
- apakah dokumen tanpa harga boleh dikirim ke customer. Kode sekarang
  mengizinkan menyimpan draft tanpa harga, tetapi approval diblokir sampai
  `PRICED`.

## 8. Siapa melakukan apa

### Mba Lia / Marketing

- Mengunci aturan nomor quotation dan revisi.
- Memilih masa berlaku quotation.
- Mengonfirmasi pembagian role verifikasi/approval.
- Mereview tampilan PDF/Excel dan syarat penawaran.
- Menentukan apakah scope tanpa harga boleh dikirim.
- Memimpin UAT Sales/CS dan menyetujui hasilnya.

### Sales / CS

- Memberikan master customer nyata dan menguji kelengkapan intake.
- Menguji lead direct, lead yang membutuhkan survey, serta perubahan status.
- Mengisi dan memeriksa harga quotation sesuai otorisasi.
- Meninjau draft email sebelum Send dan memeriksa penerima/CC/attachment.

### Technical / Laboratorium

- Memverifikasi parameter, metode, durasi, baku mutu, sampling method, dan
  status akreditasi.
- Menentukan pelaksana survey serta isi Resume Survey yang benar.
- Mengonfirmasi aturan TAT dan kalender hari libur.
- Mereview dampak data quotation ke LTR, COC, STPS, sample, dan COA.

### Finance / Manajemen

- Menyetujui price list, diskon, PPN, minimum order, rekening, dan payment term.
- Menyetujui identitas legal/footer serta kebijakan tanda tangan/QR.

### Developer / IT

- Menyelesaikan integrasi CS dan propagation Resume Survey.
- Mengimpor data yang sudah disetujui, membuat migration yang aman, dan tidak
  menjalankan full seed sembarangan.
- Menjalankan UAT teknis, memperbaiki hasilnya, dan menambahkan automated test.
- Mengelola Resend/domain/env secara rahasia dan menambahkan webhook.
- Menjaga deployment, health check, backup/rollback, dan integrasi branch.

## 9. File penting untuk melanjutkan kode

| Keperluan | Lokasi |
| --- | --- |
| Schema utama | `prisma/schema.prisma` |
| Migration marketing awal | `prisma/migrations/20260810190000_marketing_lead_customer_tat_email/` |
| Struktur quotation resmi | `prisma/migrations/20260811150000_official_quotation_structure/` |
| Mode harga legacy/package dan sort | `prisma/migrations/20260811200000_quotation_pricing_mode_item_sort/` |
| Sync katalog pengujian | `scripts/sync-menu-pengujian.ts` |
| Converter/audit katalog | `scripts/convert-menu-pengujian.ts`, `scripts/check-marketing-workbook.ts` |
| Pemisah durasi vs metode sampling | `src/lib/sampling-duration-catalog.ts` |
| Kunci varian metode | `regulationParameterVariantKey()` di `src/lib/marketing-master-workbook.ts` |
| Form quotation | `src/components/quotation/QuotationFlowClient.tsx` |
| Editor grup | `src/components/quotation/QuotationGroupsEditor.tsx` |
| Resolver harga/isi | `src/lib/quotation-content.ts` |
| TAT | `src/lib/tat-policy.ts` |
| Customer code | `src/lib/customer-code.ts` |
| Nomor lead/survey | `src/lib/marketing-number.ts` |
| Nomor order/dokumen sementara | `src/lib/order-code.ts` |
| Lead & survey UI | `src/components/marketing/LeadSurveyClient.tsx` |
| Sistem desain UI | `docs/UI-DESIGN-SYSTEM.md`, `src/app/globals.css` |
| Topbar workspace | `src/components/layout/WorkspaceTopbar.tsx` |
| Dialog aksi bersama | `src/components/ui/useActionDialog.tsx` |
| API email | `src/app/api/quotations/[id]/email/` |
| Provider email | `src/lib/email-delivery.ts` |
| Tes Resend | `scripts/test-resend-email.ts` |
| Config dokumen | `src/lib/exports/quotation-document-config.ts` |
| PDF quotation | `src/lib/exports/pdf/QuotationPdf.tsx` |
| Excel quotation | `src/lib/exports/excel/quotation-excel.ts` |
| Shared query export | `src/lib/exports/quotation-data.ts` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| CI/deploy | `.github/workflows/deploy.yml`, `scripts/deploy-vps.sh` |

## 10. Aturan data yang mudah salah

1. `null` pada harga berarti **belum ditetapkan**, sedangkan `0` berarti harga
   nol yang sengaja diberikan. Jangan memakai `value || 0` pada data harga.
2. Harga resmi berada pada paket/grup, bukan setiap parameter.
3. Qty adalah angka komersial manual. Jangan selalu menyamakannya dengan jumlah
   lokasi sampling.
4. Satu grup dapat mempunyai banyak regulasi.
5. Urutan parameter harus memakai `sort`, bukan mengandalkan urutan bawaan DB.
6. Harga TAT hanya menaikkan subtotal jasa pengujian sesuai implementasi saat
   ini, tidak menaikkan biaya sampling/dokumen.
7. Parameter/metode/durasi pada quotation dan survey adalah snapshot. Perubahan
   master tidak boleh diam-diam mengubah dokumen lama.
8. Jangan menjadikan sheet `2 Quotation (lama)` dari XLSM sebagai sumber. Sheet
   itu hidden dan memiliki external reference/formula rusak.
9. Jangan menyalin nama perusahaan, rekening, harga, tanda tangan, atau aset
   `PT CONTOH` ke source maupun environment Medialab.
10. Sheet STPS/Invoice pada contoh mempunyai defect atau placeholder; audit dulu
    sebelum menyelaraskan generator turunannya.

## 11. Aturan keamanan dan deployment untuk Claude

- Jangan pernah menampilkan isi `.env`, `DATABASE_URL`, `JWT_SECRET`, API key,
  password, private SSH key, atau rekening di output/commit.
- Untuk memeriksa env VPS, hanya laporkan nama variabel sebagai `set/missing`.
- Jangan menyimpan API key di constructor `new Resend("re_...")`. Script test
  wajib membaca `process.env.RESEND_API_KEY`.
- Jangan menjalankan `prisma migrate reset`, `db push`, atau destructive SQL pada
  database shared/VPS.
- Jangan menjalankan `pnpm db:seed` pada environment berisi data tanpa otorisasi
  jelas. Gunakan `pnpm db:seed:marketing` hanya bila sinkronisasi master memang
  diminta dan dampaknya sudah dipahami.
- `RUN_FULL_SEED_ON_DEPLOY=true` hanya untuk bootstrap satu kali non-production,
  lalu harus dihapus/dikembalikan `false`.
- Pertahankan migration backward-compatible karena rollback deployment hanya
  mengembalikan kode, bukan database.
- Jangan mengubah/menghapus `.claude/settings.local.json`; file itu milik
  konfigurasi lokal pengguna.
- Jangan push atau merge tanpa permintaan pengguna. Commit lokal juga hanya
  dilakukan bila diminta.

Peta environment:

| Branch | Environment | Port | App root | Database |
| --- | --- | --- | --- | --- |
| `main` | production | 3001 | `/opt/apps/lims-medialab` | `lims_medialab` |
| `development` | development | 3011 | `/opt/apps/lims-medialab-development` | `lims_development` |
| `marketing-dev` | marketing | 3012 | `/opt/apps/lims-medialab-marketing` | `lims_marketing` |
| `coa-dev` | coa | 3013 | `/opt/apps/lims-medialab-coa` | `lims_coa` |

## 12. Checklist kerja Claude berikutnya

Urutan yang disarankan:

1. Jalankan `git status --short`, periksa branch/commit, dan jangan menyentuh
   perubahan milik pengguna.
2. Baca dokumen audit resmi dan kode yang terkait langsung dengan tugas.
3. Minta keputusan Mba Lia untuk penomoran, validity, ownership verifikasi, dan
   data harga; pekerjaan lain yang aman dapat berjalan paralel tanpa menebak.
4. Perbaiki alur CS agar customer baru dapat dicatat dengan hak yang tepat.
5. Teruskan hasil Resume Survey berbasis form menjadi grup quotation secara
   otomatis setelah pemetaan bisnisnya disetujui.
6. Jalankan `pnpm db:sync:menu-pengujian` pada database marketing setelah
   deployment, kemudian masukkan harga hanya dari sumber yang disahkan.
7. Jalankan UAT end-to-end pada role CS, Sales, Manager, Technical, dan Customer,
   termasuk satu email quotation nyata ke alamat internal.
8. Tambahkan test otomatis untuk aturan paling berisiko sebelum merge.
9. Fetch dan integrasikan commit terbaru `development`/`coa-dev`; review seluruh
   migration dan konflik model bersama.
10. Jalankan pemeriksaan akhir:

```bash
corepack pnpm exec prisma validate
corepack pnpm exec prisma migrate status
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
corepack pnpm check:workbook
git diff --check
git status --short
```

Gunakan Node 22 seperti CI/VPS ketika menjalankan `check:workbook`. Jika sebuah
check gagal karena environment, laporkan error persis dan bedakan dari kegagalan
kode/data.

Setelah setiap pekerjaan, perbarui dokumen ini dengan tanggal, commit, bukti
tes, bagian yang selesai, bagian yang masih parsial, dan blocker yang masih
membutuhkan manusia. Jangan mengubah status menjadi “selesai” hanya karena UI
sudah terlihat; status selesai memerlukan aturan bisnis, persistensi/API, RBAC,
export, dan UAT yang konsisten.
