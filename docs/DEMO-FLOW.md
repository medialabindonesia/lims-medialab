# LIMS Medialab — Demo Flow

## Alur hulu ke hilir

1. Customer membuat quotation dan memilih template COA.
2. Sales memverifikasi; customer dapat meminta revisi; sales merevisi; manager menyetujui.
3. Customer mengonfirmasi dan mengunggah PO.
4. Sales membuat LTR; Technical membuat COC/STPS.
5. Customer/Lab Admin membuat sample dari quotation berstatus `COC_CREATED`.
6. Lab Admin menerima sample (`RECEIVED`) lalu mendistribusikan tiap parameter ke analyst (`DISTRIBUTED`).
7. Analyst menjalankan analisis (`IN_PROGRESS`) dan memasukkan hasil (`ENTERED`).
8. Supervisor melakukan review (`REVIEWED`) dan verify (`VERIFIED`).
9. Lab Manager melakukan validate (`VALIDATED`).
10. Bila ada masalah, Supervisor/Manager memilih Ask Retest (`RETEST`). Hasil harus masuk lagi ke siklus enter → review → verify → validate.
11. Preliminary COA dan Final COA dibuat setelah status laboratorium memenuhi prasyarat.

Semua tahap laboratorium tersedia sebagai menu terpisah dan setiap API memeriksa status sebelumnya, role, serta parameter yang eligible.

## Revisi dan restore yang aman

- Quotation dan hasil laboratorium disimpan sebagai snapshot immutable dengan nomor revisi berurutan.
- Snapshot memiliki checksum SHA-256, actor, role, waktu, IP, user-agent, alasan, parent revision, dan sumber revisi yang direstore.
- Memilih revisi 5 ketika revisi terbaru 10 **tidak menghapus revisi 6–10**. Sistem membuat revisi 11 dengan `restoredFromRevisionId` menunjuk revisi 5.
- Restore hasil laboratorium mengubah hasil menjadi `ENTERED` dan mengosongkan approval sebelumnya. Review, verify, dan validate wajib diulang.
- Restore quotation yang sudah memiliki sample diblokir. Perubahan downstream harus dilakukan melalui revisi hasil laboratorium agar data quotation, sample, dan COA tidak saling bertentangan.
- `Standard / Limit`, method, unit, dan nama parameter disalin ke snapshot sample. Perubahan template master tidak mengubah PDF lama.

Menu internal: **Quality & Audit → Revision Audit Trail**.

## Support Center

Room chat memakai konteks:

- `GENERAL`: konsultasi sebelum memesan.
- `QUOTATION`: membahas quotation tertentu.
- `ORDER_SAMPLE`: komplain atau diskusi untuk sample/pesanan tertentu.
- `RESULT_REVISION`: membahas revisi hasil tertentu.

Lampiran yang didukung:

- Gambar JPEG/PNG/WebP/HEIC; gambar kompatibel dikompresi di browser, maksimal 2560 px, kualitas 84%.
- Video MP4/WebM/QuickTime maksimal 1080p.
- Audio MP3/MP4/WAV/OGG/WebM.
- PDF, TXT, CSV, XLS/XLSX/XLSM/ODS, DOC/DOCX.
- Maksimal delapan file per pesan dan 250 MB per file.

Upload memakai Vercel Blob langsung dari browser (multipart untuk file besar), sehingga media tidak melewati batas payload Vercel Function. Hubungkan sebuah **public Vercel Blob store** ke project agar `BLOB_READ_WRITE_TOKEN` tersedia pada deployment. URL blob tetap diikat ke ID tiket dan diverifikasi lagi saat pesan disimpan.

## Checklist demo

- Login Super Admin dan pastikan semua menu lab serta Revision Audit Trail terlihat.
- Demonstrasikan satu sample: receive → distribute → conduct → enter → review → verify → validate.
- Ubah kolom Standard/Limit pada Review/Verify/Validate/Ask Retest, masukkan alasan, lalu cek revisi baru.
- Dari Revision Audit Trail, pilih snapshot lama dan restore; tunjukkan bahwa nomor revisi bertambah dan approval dibuka ulang.
- Login customer, buat tiket dengan konteks Umum, Quotation, Pesanan/Sample, atau Revisi Hasil.
- Di room chat, tunjukkan tombol Kamera, Galeri, Dokumen, dan Audio serta preview lampiran.
- Generate Lab Result PDF dan pastikan Standard/Limit sesuai snapshot revisi, bukan nilai template terbaru.
