# Medialab LIMS — Enterprise UI System

Terakhir diperbarui: **12 Agustus 2026**  
Branch implementasi: **`marketing-dev`**

Dokumen ini adalah acuan visual dan interaksi seluruh LIMS Medialab. Referensi
utamanya adalah mockup operasional yang diberikan pemilik produk: sidebar putih,
top command bar, informasi berlapis tetapi rapat, status semantik, dan permukaan
dengan border tipis.

Perubahan UI tidak mengubah workflow, permission, perhitungan, status dokumen,
atau kontrak API yang sudah ada.

## 1. Karakter produk

Antarmuka harus terasa:

- tenang dan presisi, bukan dekoratif;
- padat tetapi mudah dipindai;
- premium melalui konsistensi dan detail, bukan melalui shadow besar;
- jelas membedakan informasi, status, dan tindakan;
- layak dipakai terus-menerus oleh tim operasional.

## 2. Struktur global

### Desktop

- Sidebar putih selebar `15.5rem`, dapat diringkas menjadi `4.75rem`.
- Topbar global setinggi `4.25rem` berisi breadcrumb, command search,
  notification entry, dan identitas user.
- Isi halaman memakai lebar maksimum `96rem` dan canvas abu-abu sangat muda.
- Navigasi aktif ditandai latar biru muda dan garis biru di sisi kiri.

### Mobile

- Topbar mempertahankan pencarian dan identitas user.
- Sidebar berubah menjadi drawer yang dibuka lewat tombol menu.
- Dialog berubah menjadi bottom sheet pada layar kecil.
- Target sentuh utama minimal 40–44 piksel.

## 3. Visual tokens

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| Brand navy | `#072B6B` | Identitas dan emphasis khusus |
| Primary blue | `#114DA5` | Tombol utama, focus, navigasi aktif |
| Sky blue | `#69CBF7` | Aksen sekunder |
| Brand lime | `#6FBC1D` | Identitas dan success highlight terbatas |
| Canvas | `#F7F9FB` | Latar aplikasi |
| Surface | `#FFFFFF` | Card, sidebar, topbar, dialog |
| Border | `#DDE3EA` | Pemisah dan struktur |
| Foreground | `#172033` | Teks utama |

Radius card standar adalah 14–16 piksel. Radius tombol dan input adalah 10–12
pixel. Shadow hanya digunakan untuk dialog, dropdown, top-layer, atau hover yang
membutuhkan petunjuk elevasi.

## 4. Hierarki halaman

Urutan konsisten setiap halaman:

1. breadcrumb global di topbar;
2. eyebrow, judul, deskripsi, dan aksi utama pada `PageHeader`;
3. statistik atau filter ringkas;
4. workspace utama berbasis table, list-detail, atau form;
5. tindakan final berada di lokasi yang stabil.

Header tidak dibungkus hero card besar. Halaman operasional tidak memakai
gradient dekoratif sebagai latar card.

## 5. Status dan warna

- Biru: informasi, proses aktif, dan primary action.
- Hijau: berhasil, lengkap, memenuhi, atau siap.
- Oranye/amber: butuh perhatian atau menunggu.
- Merah: error, melewati batas, ditolak, atau tindakan destruktif.
- Abu-abu: belum dimulai, nonaktif, atau informasi sekunder.

Warna tidak boleh menjadi satu-satunya pembeda. Setiap status juga memiliki
label, ikon, atau bentuk yang dapat dipahami tanpa warna.

## 6. Motion

- Perpindahan halaman: fade dan pergeseran maksimal 6–8 piksel, 120–280 ms.
- Drawer dan dialog: 160–240 ms dengan easing konsisten.
- Expand/collapse: tinggi dan opacity, tanpa bounce berlebihan.
- Hover card: elevasi maksimal 2 piksel.
- Semua motion menghormati `prefers-reduced-motion`.

Animasi dipakai untuk menjaga orientasi, menunjukkan hubungan sebab-akibat, dan
memberi feedback. Animasi tidak dipakai hanya sebagai dekorasi.

## 7. Implementasi utama

- `WorkspaceTopbar.tsx`: breadcrumb, command search `Ctrl/Cmd + K`, user menu.
- `Sidebar.tsx`: navigasi putih, collapsed state, mobile drawer.
- `PageHeader.tsx` dan `MotionHeader.tsx`: hierarki judul yang ringkas.
- `globals.css`: tokens, compatibility layer, form/focus/table behavior.
- `LeadSurveyClient.tsx`: pola queue-detail dan dialog survey/resume.
- `QuotationFlowClient.tsx`: wizard operasional dan progress yang lebih padat.
- `QuotationGroupsEditor.tsx`: paket pengujian berbasis disclosure terstruktur.

### Pola form Buat Quotation

Form panjang tidak dibentangkan sebagai grid tiga kolom yang meminta mata
bergerak bolak-balik. Polanya adalah:

- satu kolom kerja utama dengan urutan baca vertikal;
- satu ringkasan berjalan yang sticky di desktop dan dipadatkan ke action bar
  di layar kecil;
- tiga tahap berdasarkan keputusan user: Tujuan, Ruang Lingkup, Komersial;
- field detail disusun dari konteks terbesar: customer, periode, layanan,
  tujuan, lalu catatan;
- editor paket mengarahkan urutan matriks, regulasi, parameter, dan titik;
- baris biaya memakai dua tingkat berlabel, bukan banyak input sempit dalam satu
  baris;
- action bar selalu menyediakan alasan validasi, total, kembali, dan tindakan
  berikutnya pada posisi yang stabil.

Implementasi telah diuji di browser pada viewport desktop `1600x1000` dan
mobile `390x844`, termasuk memilih customer, menyusun satu paket uji, dan masuk
ke tahap komersial. Tidak ditemukan overflow horizontal atau error runtime.

## 8. Aturan untuk pengembangan berikutnya

1. Gunakan komponen bersama sebelum menambah variasi baru.
2. Jangan membuat hero card baru untuk judul halaman.
3. Jangan memakai `rounded-[2rem]` atau shadow besar pada surface biasa.
4. Gunakan primary blue untuk tindakan utama; warna status harus semantik.
5. Form panjang harus dipisah berdasarkan keputusan user, bukan berdasarkan
   struktur tabel database.
6. Pada list operasional, pertahankan filter dan item terpilih saat data dimuat
   ulang jika masih tersedia.
7. Empty, loading, error, disabled, dan focus state wajib dirancang bersama
   happy path.
