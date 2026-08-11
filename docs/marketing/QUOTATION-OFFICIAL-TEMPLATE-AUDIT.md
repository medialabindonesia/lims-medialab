# Audit Template Quotation Resmi dan Status Implementasi

Status: **acuan implementasi aktif**
Terakhir diperbarui: 11 Agustus 2026

## Sumber yang diperiksa

- `docs/MI.QT.001.26030811 PT CONTOH.xlsm`
- `docs/MI.QT.001.26030811 PT CONTOH.pdf`
- `docs/generated/master-marketing-menu-2024.xlsx`, hasil konversi penuh dari
  `MENU PENGUJIAN 2024.xlsx` dalam keadaan tidak tersortir.

Data perusahaan, nama orang, tanda tangan, nomor rekening, dan harga milik
`PT CONTOH` hanya dipakai untuk memahami bentuk dokumen. Nilai tersebut tidak
diimpor sebagai master Medialab.

## Temuan yang mengubah desain

1. Harga pada surat penawaran adalah **harga paket per grup pengujian**, bukan
   harga setiap parameter. Harga paket dikalikan qty komersial.
2. Qty harus dapat diisi manual. Dua lokasi tidak selalu berarti qty dua.
3. Satu grup dapat memakai lebih dari satu regulasi, selama masih berada dalam
   konteks matriks yang sama.
4. Selain paket pengujian, quotation memiliki rincian biaya **sampling**,
   **dokumen**, dan biaya lain.
5. Format aktif adalah sheet `2 Quotation` Rev.07. Sheet
   `2 Quotation (lama)` tersembunyi dan memiliki referensi lama/rusak, sehingga
   tidak dijadikan sumber.
6. Macro workbook hanya membantu konversi angka ke tulisan dan menyimpan fungsi
   lama; macro bukan automasi approval/email yang perlu ditiru aplikasi.

## Yang sudah diterapkan

- Grup quotation mendukung multi-regulasi, harga paket, base price, lokasi,
  parameter, metode, durasi, dan qty manual.
- Biaya sampling, dokumen, dan biaya lain menjadi baris terperinci; diskon dan
  label diskon tersedia.
- Gerbang approval memeriksa harga paket/biaya, bukan memaksa setiap parameter
  mempunyai harga.
- PDF dan Excel menggunakan struktur surat penawaran berbahasa Indonesia,
  harga kosong ditampilkan sebagai `—`, serta memuat customer, billing,
  logistik, ringkasan biaya, syarat, dan tiga peran penandatangan.
- TAT mengikuti hasil meeting terbaru: Normal 10 hari kerja, Urgent 7 hari
  (+30%), dan Top Urgent 5 hari (+50%).
- Draft email dapat dilihat dan diedit sales. Pengiriman memakai lampiran yang
  dibuat saat tombol Send ditekan, penguncian antartab, dan idempotency key.
- Send tetap dikunci bila kredensial provider atau identitas legal/rekening
  dokumen belum lengkap, sehingga fallback preview tidak dapat terkirim sebagai
  dokumen resmi.
- Seluruh workbook menu telah berhasil diimpor ke database UAT lokal melalui
  API aplikasi: 47 node matriks, 293 regulasi, dan lebih dari 3.000 relasi
  parameter-regulasi. Harga tetap kosong karena sumber tidak memuat price list.

## Keputusan bisnis yang masih diperlukan

| Keputusan | Pemilik keputusan | Mengapa diperlukan |
| --- | --- | --- |
| Rumus nomor `MI.QT.001.26030811.REV1` | Mba Lia / Marketing | Satu contoh belum cukup untuk memastikan arti seluruh segmennya. |
| Masa berlaku 7 atau 30 hari | Mba Lia / Marketing | Contoh XLSM memakai 7 hari, aplikasi sebelumnya 30 hari. |
| TAT 10/7/5 dan kalender hari libur | Mba Lia + Teknis | Syarat template menyebut 14 hari dan sheet COC lama memiliki tier berbeda. Implementasi sementara mengikuti meeting terbaru. |
| Price list paket/base price | Marketing / Finance | Workbook menu dan contoh format tidak boleh dianggap sebagai daftar harga master. |
| Identitas legal, rekening, footer, minimum order | Manajemen / Finance / IT | Harus dimasukkan lewat environment produksi, bukan disalin dari PT CONTOH. |
| Bentuk tanda tangan atau QR approval | Manajemen | Model data aset tanda tangan/QR belum ditentukan. |

## Pekerjaan operasional setelah keputusan tersedia

- IT memasang kredensial provider email dan sender domain yang sudah
  diverifikasi, lalu melakukan tes kirim nyata ke alamat internal.
- Admin deployment menerapkan migration dan mengimpor workbook canonical pada
  database target. Full seed tidak boleh dijalankan sembarangan di produksi.
- Developer dapat menambahkan kalender hari libur, delivery/bounce webhook,
  dan aset tanda tangan/QR setelah kebijakan dan datanya disetujui.
