# Desain Ulang Alur Quotation (Marketing)

Status: **draft desain, belum diimplementasi penuh**
Branch: `marketing-dev`
Terakhir diperbarui: 7 Agustus 2026

Dokumen ini punya dua pembaca:

- **Bagian 1–3** ditujukan untuk tim Sales & Marketing Medialab. Tidak ada istilah
  teknis. Bagian inilah yang dipakai untuk menjelaskan dan untuk meminta data.
- **Bagian 4–7** ditujukan untuk pengembang (koordinasi dengan pengerjaan COA).

---

## 1. Masalah yang sedang diperbaiki

Form quotation yang sekarang memaksa sales mengisi **satu baris untuk setiap
parameter uji**. Akibatnya, untuk satu pekerjaan Udara Ambien dengan 10 parameter,
sales harus mengetik ulang regulasi, lokasi sampling, durasi, dan matriks sebanyak
**10 kali** dengan isi yang persis sama.

Padahal di surat penawaran resmi Medialab (`MI-FR-MKT-8.2-01.01; Rev.07`), satu
baris **bukan** satu parameter. Satu baris adalah **satu paket pekerjaan**:

| No | Deskripsi | Sample ID | Regulasi (Matriks) | Parameter Uji | Qty |
|----|-----------|-----------|--------------------|---------------|-----|
| 1 | Udara Ambien | Upwind, Downwind | PPRi 22/2021 Lamp VII (UA) | SO₂, CO, NO₂, O₃, NMHC, TSP, PM10, PM2.5, Pb, NH₃, H₂S | 2 |
| 2 | Udara Ambien – Kebisingan | Upwind, Downwind | Kep-48/MenLH/1996 (UAF) | Noise | 2 |
| 3 | Emisi Udara Sumber Tidak Bergerak | Boiler, Deco, Coater, Washer Dryer, IBO | PermenLH 07/2007 Lamp VI (UE-N) | SO₂, NO₂, Velocity, O₂ | 5 |

Perhatikan **Qty 2** pada baris 1. Itu artinya **2 titik sampling**
(Upwind dan Downwind) — bukan 2× SO₂. Satu qty berlaku untuk seluruh paket.

**Kesimpulan:** akar masalahnya bukan lebar kolom yang terpotong, melainkan
struktur datanya. Kolom sempit hanyalah gejala.

---

## 2. Alur baru untuk sales

### Langkah 1 — Detail

Yang diisi: **Customer**, tanggal quotation, berlaku hingga, sampling oleh,
TAT, tujuan pengujian, catatan.

Perubahan:

- **Pencarian customer.** Ketik satu huruf, kandidat langsung muncul. Nama PT
  ditampilkan penuh (dua baris kalau panjang), tidak lagi dipotong titik tiga.
  Baris kedua menampilkan kota dan nama PIC untuk membedakan customer bernama mirip.
  Daftar diurutkan alfanumerik.
- **Tombol tambah customer.** Kalau customer belum pernah pakai jasa Medialab,
  sales bisa menambahkannya langsung dari form ini tanpa keluar. Cukup isi
  nama PT, PIC, dan kontak; alamat/NPWP/penagihan dilengkapi belakangan di
  Master Customer.
- **Field "Template COA" dihapus** dari langkah ini. Sales tidak perlu tahu soal
  template COA — itu urusan tim laboratorium, dan sekarang informasi matriksnya
  sudah otomatis ikut dari Langkah 2.

### Langkah 2 — Parameter (perubahan terbesar)

Sekarang berbasis **Grup**, persis seperti baris-baris pada surat penawaran resmi.

```
STEP 2 — PARAMETER

▼ Grup 1 · Udara Ambien                       Rp 1.200.000
    Regulasi : PP 22/2021 Lampiran VII
    Titik    : Upwind, Downwind          Qty 2
    8 dari 10 parameter dipilih
                            [Edit]  [Duplikat]  [Hapus]

▶ Grup 2 · Emisi Sumber Tidak Bergerak        Rp   750.000
▶ Grup 3 · Faktor Kimia Lingkungan Kerja      Rp        —

                    [ + Tambah Grup ]
```

Saat sebuah grup dibuka untuk diedit:

```
  Matrix    [ Air              ▾ ]
  Sub       [ Air Limbah       ▾ ]
  Jenis     [ Limbah Industri  ▾ ]
  Regulasi  [ PP 22/2021 L.VI  ▾ ]
                  ↓  parameter muncul otomatis, semua tercentang
  ☑ pH     SNI 6989.11-2004   [ Grab  ▾ ]   Rp [ 75.000 ]
  ☑ BOD    SNI 6989.72-2009   [ Grab  ▾ ]   Rp [    —    ]
  ☐ COD    SNI 6989.2-2019
  ☑ TSS    SNI 6989.3-2019    [ Grab  ▾ ]   Rp [ 90.000 ]

  Titik sampling :  [ Inlet IPAL ] [ Outlet IPAL ]  [ + titik ]
                                                       Qty 2
```

Aturannya:

1. Sales memilih **matriks** secara bertingkat. Contoh: Air → Air Limbah →
   Limbah Industri. Kalau suatu matriks tidak punya turunan (misal
   "Asesmen Ergonomi"), dropdown berikutnya tidak muncul.
2. Setelah **regulasi** dipilih, seluruh parameter uji milik regulasi itu muncul
   dalam keadaan **sudah tercentang semua**. Sales tinggal meng-*untick* yang
   tidak diperlukan customer.
3. **Metode mengikuti parameter** — terisi otomatis, tidak diketik.
4. **Durasi dipilih dari daftar yang sah** untuk parameter tersebut (lihat §3).
5. **Titik sampling** ditulis sekali per grup. Qty terisi otomatis sesuai jumlah
   titik, dan masih bisa diubah manual.

Satu quotation boleh punya berapa pun grup. Contoh PDF resmi punya 9 grup.

### Langkah 3 — Ringkasan

Biaya sampling, diskon, VAT, syarat pembayaran, dan total. Tambahan:

- **Rincian per grup** ditampilkan, bukan hanya angka total, supaya sales bisa
  mengecek sebelum kirim.
- Kalau masih ada harga yang belum diisi, ditampilkan peringatan jelas:
  *"3 parameter belum berharga — quotation masih bisa disimpan dan dikirim
  sebagai penawaran scope, tapi belum bisa di-approve."*

---

## 3. Dua hal yang sering ditanya

### 3.1 Harga boleh dikosongkan

Permintaan dari sales: *"bisa kalau nggak ada harganya dulu? sales masih
nyusun-nyusun itu dulu, harga mungkin nanti, tapi jangan dihilangkan total juga."*

Yang akan dibuat:

| | Perilaku |
|---|---|
| Saat memilih parameter | Harga **otomatis terisi harga dasar** jasa tersebut |
| Harga bisa diubah | Ya, bebas, sales boleh menimpa dengan angka berapa pun |
| Harga boleh dikosongkan | Ya. Kosong ditampilkan `—`, **bukan Rp 0** |
| Kolom Harga & Total | **Tetap ada** di form maupun di PDF surat penawaran |
| Batasnya | Quotation **tidak bisa di-approve / dikonfirmasi / ditagihkan** selama masih ada harga kosong |

Ini sesuai dengan praktik yang sudah berjalan: pada contoh surat penawaran resmi
yang dipakai sebagai acuan, kolom Harga, Total, Sub Total, Diskon, VAT, dan
TOTAL (IDR) memang tercetak dalam keadaan kosong. Dokumen scope memang di-*issue*
lebih dulu, harga menyusul.

### 3.2 Kenapa pilihan durasi cuma 1 jam / 8 jam / 24 jam / 1 tahun / Grab

Durasi **bukan angka bebas**. Ia mengikuti *waktu pengukuran rata-rata* yang
ditetapkan regulasi untuk parameter tersebut. Contoh dari PP RI No. 22 Tahun 2021
Lampiran VII yang sudah ada di sistem:

| Parameter | Durasi yang sah | Baku mutu |
|---|---|---|
| SO₂ | 1 jam / 24 jam / 1 tahun | 150 / 75 / 45 µg/m³ |
| CO | 1 jam / 8 jam | 10000 / 4000 µg/m³ |
| PM2.5 | 24 jam / 1 tahun | 55 / 15 µg/m³ |
| Pb | 24 jam | 2 µg/m³ |

Perhatikan: **CO tidak punya baku mutu 1 tahun.** Kalau sales memilih durasi
1 tahun untuk CO, hasil ujinya tidak bisa dibandingkan dengan baku mutu mana pun —
COA-nya jadi tidak sah. Karena itu dropdown durasi hanya akan menawarkan pilihan
yang benar untuk parameter dan regulasi yang sedang dipilih.

Untuk lingkungan kerja (Permenaker No. 5 Tahun 2018), durasi 8 jam mengacu pada
NAB rata-rata satu shift kerja. "Grab" berarti pengukuran sesaat, dipakai untuk
parameter yang tidak punya periode rata-rata — misalnya iluminasi, ergonomi,
dan asesmen psikologi.

> **Perlu dikonfirmasi ke tim lab / teknis:** daftar durasi per parameter
> di atas baru diturunkan dari regulasi dan dari isi sistem yang ada. Sebelum
> dipakai produksi, daftar ini harus diverifikasi oleh Manajer Teknis.

---

## 4. Data yang dibutuhkan dari tim Sales

Ini bagian yang menghambat. **Tidak perlu mengisi form apa pun** — cukup kirimkan
file yang sudah ada apa adanya (Excel, Word, PDF, hasil export sistem lama, bahkan
foto arsip). Sistem akan dibuatkan fitur impor, jadi format aslinya tidak masalah.

Yang dibutuhkan, urut dari yang paling menghambat:

| # | Data | Bentuk yang diterima | Dipakai untuk |
|---|------|----------------------|---------------|
| 1 | **Daftar pelanggan** | Export apa pun — Excel CRM, daftar penagihan, arsip surat penawaran | Mengisi pencarian customer. Sekarang sistem hanya punya 2 data contoh |
| 2 | **Price list jasa** | File harga yang dipakai sehari-hari | Harga dasar yang muncul otomatis saat parameter dipilih |
| 3 | **Daftar matriks & regulasi** | Boleh sekadar daftar di WhatsApp | Isi dropdown bertingkat di Langkah 2 |
| 4 | **Parameter per regulasi + metode** | Arsip surat penawaran lama sudah cukup | Daftar centang parameter, dan pengisian metode otomatis |

Kalau memudahkan, kolom idealnya seperti ini — tapi sekali lagi, **file apa adanya
lebih dihargai daripada menunggu template diisi**:

```
Matriks | Sub-matriks | Regulasi | Parameter | Satuan | Metode | Durasi | Baku Mutu | Harga Dasar | Terakreditasi (Y/N)
```

**Selama data ini belum ada, pengerjaan tetap jalan.** Struktur matriks, regulasi,
parameter, metode, dan durasi akan diisi lebih dulu dari surat penawaran resmi
yang sudah ada dan dari teks regulasi publik (PP 22/2021, PermenLH 07/2007,
Kepmen LH 48 & 50/1996, Permenaker 5/2018). Kolom harga dibiarkan kosong.
Begitu price list asli datang, tinggal diimpor — tidak ada pekerjaan yang terbuang.

---

## 5. Perubahan basis data

### 5.1 Master baru

```
Matrix (pohon, kedalaman bebas)
  id, parentId → Matrix, code, name, sort, isActive

Regulation
  id, matrixId → Matrix, code, name, shortName, note, sort, isActive

SamplingDuration                     ← master label durasi
  id, code (GRAB/H1/H8/H24/Y1), label, minutes, sort

RegulationParameter                  ← inti: parameter milik suatu regulasi
  id, regulationId, parameterId → AnalysisParameter
  displayName, unit, method, limitValue
  basePrice (nullable), isAccredited, defaultSelected, sort

RegulationParameterDuration          ← durasi sah + baku mutunya
  id, regulationParameterId, durationId → SamplingDuration
  limitValue, isDefault
```

`Matrix.parentId` menunjuk ke `Matrix` itu sendiri, sehingga
Air → Air Limbah → Limbah Industri (3 tingkat) dan Asesmen Ergonomi (1 tingkat)
sama-sama muat tanpa mengubah skema lagi.

`isAccredited = false` dipakai untuk mencetak tanda `*` pada PDF, sesuai
Syarat & Ketentuan no. 1 pada surat penawaran resmi
(*"Parameter tidak terakreditasi ditandai \*"*).

### 5.2 Perubahan pada Quotation

```
QuotationGroup                       ← BARU, satu baris di surat penawaran
  id, quotationId, sort, description
  matrixId, regulationId, qty, note

QuotationGroupLocation               ← BARU, titik sampling per grup
  id, groupId, label, customerSampleId, sort

QuotationItem                        ← DIUBAH
  + groupId          (nullable, agar data lama tetap valid)
  + durationId
  + basePrice        (harga dasar saat item dibuat, untuk jejak audit)
  ~ price            Float → Float?   (kosong = belum ditetapkan)

Quotation                            ← DITAMBAH
  + orderCode        unik, mis. ML-26-0148
  + pricingStatus    UNPRICED | PARTIAL | PRICED
```

`coaTemplateId` pada `Quotation` **tetap ada dan tidak diubah**, hanya tidak lagi
diisi oleh sales.

### 5.3 Penomoran dokumen

Satu pesanan memakai satu kode induk yang diwarisi seluruh dokumennya:

```
ORDER  ML-26-0148
  ├─ Quotation   ML-26-0148-QT      (revisi: -QT-R1, -QT-R2)
  ├─ LTR         ML-26-0148-LTR
  ├─ CoC         ML-26-0148-COC
  ├─ Sample      ML-26-0148-S01, -S02
  ├─ CoA         ML-26-0148-COA
  └─ Invoice     ML-26-0148-INV
```

Tujuannya: sales, lab, finance, dan admin menyebut **angka yang sama** untuk
pesanan yang sama. `id` internal tetap `cuid` sebagai primary key, dan
`quotationNo` yang sudah ada tetap disimpan agar dokumen lama tidak kehilangan
identitasnya.

---

## 6. Kontrak dengan pengerjaan COA

Pengerjaan COA (`coa-dev`) dan marketing (`marketing-dev`) berjalan terpisah dan
akan disatukan di `development`. Titik singgungnya **bukan** `CoaTemplate`,
melainkan tabel `AnalysisParameter` yang dipakai berdua.

Aturan yang dipegang sisi marketing:

1. `AnalysisParameter` diperlakukan sebagai **kontrak beku**. Tidak ada kolom yang
   diubah, diganti nama, atau dihapus.
2. Yang ditambahkan hanya *back-relation* Prisma (`regulationParameters`), yang
   tidak menghasilkan kolom SQL apa pun pada tabel tersebut — sehingga tidak
   mungkin memecahkan kode COA.
3. `CoaTemplate` dan `CoaTemplateParameter` tidak disentuh sama sekali.
4. Kalau ternyata sisi marketing butuh kolom baru di `AnalysisParameter`,
   pengerjaan **berhenti dan dibicarakan dulu**, tidak diputuskan sepihak.

Sisi COA diharapkan memegang aturan cermin: tidak menghapus kolom
`AnalysisParameter` dan tidak menyentuh `Quotation*`.

Risiko yang tersisa: dua sumber kebenaran untuk "parameter dalam suatu konteks"
(`CoaTemplateParameter` dan `RegulationParameter`). Penyatuannya sengaja
ditunda ke `development` dan diperlakukan sebagai pekerjaan tersendiri.

---

## 7. Catatan RBAC

Halaman **RBAC Role & Menu** memungkinkan admin mematikan izin `Approve` pada
sebuah role. Kalau izin itu dimatikan pada role **terakhir** yang memilikinya,
quotation akan tersangkut selamanya di status `REQUESTED` tanpa ada yang bisa
memindahkannya.

Karena itu izin dipisah menjadi tiga lapis:

1. **Alur kerja** — tetap (`REQUESTED → VERIFIED → APPROVED → CONFIRMED`).
   Tidak bisa dimatikan lewat halaman RBAC. Ini aturan bisnis, bukan setelan.
2. **RBAC** — hanya mengatur **role mana** yang memegang suatu izin.
3. **Pemeriksaan keutuhan** — halaman RBAC menolak menyimpan jika hasilnya ada
   izin wajib yang tidak dipegang role aktif mana pun, dengan pesan eksplisit:
   *"Tidak ada role yang bisa Approve Quotation. Alur akan macet."*
