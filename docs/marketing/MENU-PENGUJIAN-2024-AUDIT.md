# Audit MENU PENGUJIAN 2024

Sumber utama adalah sheet `Database` dalam berkas `MENU PENGUJIAN 2024.xlsx` yang sudah disimpan tanpa filter/sort aktif. Sheet `Database UE` dan `Parameter Lainnya` tetap dibaca sebagai sumber tambahan; sheet pencarian dan pivot diperlakukan sebagai tampilan turunan, bukan master baru.

## Aturan pemetaan

- `SUBJECT` menjadi matriks induk; `MATRIX` menjadi matriks anak.
- Kombinasi matriks + `REGULATION IN QUOTATION` + `REGULATION IN COA` menjadi regulasi.
- `PARAMETER`, metode, unit, limit, durasi/jam, sampling method, sample matrix, dan sample size menjadi relasi parameter-regulasi.
- Tanda `*` pada parameter/`PARA QUOT` dipetakan sebagai tidak terakreditasi.
- Harga dibiarkan kosong karena workbook sumber tidak memuat harga.
- Baris tidak lengkap tidak ditebak atau digeser otomatis; baris tersebut masuk sheet `Audit Sumber` untuk review manusia.

## Temuan penting

- Sheet `Database` berisi 2.594 baris data dan tidak sedang memiliki filter/sort aktif pada versi terakhir yang diperiksa.
- Workbook memuat duplikasi exact, inkonsistensi tanda `*`, serta baris yang tidak lengkap/terindikasi bergeser. Converter menyimpan temuan tersebut di sheet audit agar data meragukan tidak diam-diam dianggap benar.
- `Database UE` dan `Parameter Lainnya` mempunyai entri unik yang tidak seluruhnya ada pada `Database`, sehingga converter menggabungkan ketiganya lalu melakukan deduplikasi berdasarkan business key lengkap.
- Workbook tidak mempunyai kolom harga; quotation dengan parameter hasil konversi tetap terkena gerbang `UNPRICED` sampai harga dasar diisi oleh sales.

Jalankan `pnpm exec tsx scripts/convert-menu-pengujian.ts "C:/path/MENU PENGUJIAN 2024.xlsx"` untuk membuat workbook canonical yang siap diunggah melalui halaman Master Marketing.
