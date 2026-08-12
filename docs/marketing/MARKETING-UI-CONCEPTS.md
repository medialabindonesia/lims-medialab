# Konsep UI/UX Marketing Medialab

Tanggal konsep: **12 Agustus 2026**  
Prototype: **`/marketing/ui-concepts`**

Dokumen ini menjelaskan tiga arah desain interaktif untuk alur marketing,
khususnya penyusunan quotation. Prototype menggunakan data contoh dan tidak
melakukan perubahan ke database atau mengirim quotation.

## Tujuan desain

Desain baru harus membuat staf memahami apa yang perlu dikerjakan berikutnya,
mengurangi input berulang, dan mencegah kesalahan teknis sebelum quotation
masuk ke verifikasi. Tampilan tetap membawa identitas Medialab, tetapi dengan
karakter perusahaan enterprise: tenang, presisi, konsisten, dan kredibel.

Prinsip yang berlaku pada ketiga konsep:

1. Bahasa antarmuka mengutamakan Bahasa Indonesia yang mudah dipahami.
2. Data Lead dan Resume Survey dibawa otomatis ke quotation.
3. Harga kosong tidak pernah disamakan dengan nol atau gratis.
4. Durasi sampling hanya ditawarkan jika sah untuk parameter dan regulasi.
5. Ringkasan biaya dan kelengkapan selalu terlihat sebelum user melanjutkan.
6. Sistem menyimpan draft otomatis dan menjelaskan field yang masih kurang.
7. Detail teknis ditampilkan bertahap agar form tidak terasa menakutkan.

## Konsep 01 — Guided Flow

Wizard empat langkah dengan satu fokus utama per layar:

`Customer → Ruang lingkup → Harga & syarat → Review`

Kelebihan:

- paling mudah dipelajari staf baru;
- risiko melewatkan field wajib paling rendah;
- penjelasan dan validasi berada dekat dengan keputusan user;
- cocok sebagai pengalaman default di desktop maupun mobile.

Trade-off: staf yang sangat berpengalaman perlu beberapa perpindahan langkah
untuk melihat seluruh isi quotation.

## Konsep 02 — Sales Desk

Workspace padat dengan konteks deal, scope pengujian, dan ringkasan komersial
terlihat bersamaan.

Kelebihan:

- perpindahan layar sangat sedikit;
- pencarian dan shortcut mendukung volume pekerjaan tinggi;
- perubahan parameter langsung tercermin pada nilai quotation;
- cocok untuk sales yang sudah hafal alur dan katalog.

Trade-off: kepadatan informasi lebih tinggi dan memerlukan masa adaptasi. Pada
mobile, setiap panel harus berubah menjadi drawer atau layar tersendiri.

## Konsep 03 — Deal Room

Workspace customer-centric yang menyatukan perjalanan Lead, Survey, Quotation,
Approval, hingga komunikasi internal.

Kelebihan:

- konteks customer dan progres deal sangat kuat;
- cocok untuk key account dan penawaran kompleks;
- handoff antar-CS, Sales, Technical, dan Approver lebih mudah ditelusuri;
- resume survey terlihat sebagai sumber scope, bukan dokumen yang terpisah.

Trade-off: membutuhkan penyelarasan data dan UI yang lebih luas daripada hanya
merombak form quotation.

## Rekomendasi

Gunakan **Guided Flow sebagai pengalaman default**. Ia paling sesuai untuk tim
dengan tingkat pengalaman yang beragam dan paling aman untuk proses yang punya
banyak aturan bisnis.

Elemen terbaik dari dua konsep lain tetap dapat dipakai:

- sediakan **Compact mode** ala Sales Desk bagi power user;
- bawa **customer journey dan smart handoff** dari Deal Room ke halaman detail
  customer/lead;
- pertahankan satu model data dan API, sehingga mode tampilan tidak menciptakan
  workflow yang berbeda.

## Batas prototype

Prototype sengaja belum mengganti halaman produksi. Setelah arah desain dipilih,
pekerjaan berikutnya adalah memetakan komponen prototype ke data nyata,
menjalankan usability test dengan staf Marketing/CS, lalu mengimplementasikan
alur terpilih secara bertahap tanpa mengubah aturan approval, pricing, dan audit.
