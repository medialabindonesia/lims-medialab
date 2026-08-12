-- Simpan otomatis isian form quotation yang belum ditekan Simpan.
--
-- Sebelum ini isian yang sedang diketik hanya dititipkan ke penyimpanan browser,
-- itu pun tidak pernah dibaca kembali dan tidak aktif sama sekali saat membuat
-- quotation baru. Akibatnya form yang panjang bisa hilang seluruhnya hanya
-- karena tab tertutup.
--
-- Draft sengaja BUKAN baris `Quotation` berstatus draft: membuat baris quotation
-- sejak awal akan memakan nomor dokumen resmi untuk setiap form yang ditinggal
-- setengah jalan, sehingga penomoran surat penawaran menjadi bolong-bolong.
--
-- Tabel baru, tidak menyentuh data yang sudah ada.

CREATE TABLE `QuotationDraft` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    -- "new" untuk quotation baru, atau id quotation yang sedang direvisi.
    -- Kolom tersendiri, bukan quotationId yang boleh NULL, karena MySQL
    -- menganggap setiap NULL berbeda sehingga kunci uniknya tidak mengikat.
    `scope` VARCHAR(64) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QuotationDraft_userId_scope_key`(`userId`, `scope`),
    INDEX `QuotationDraft_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Draft ikut terhapus bila akunnya dihapus; isinya belum menjadi dokumen resmi.
ALTER TABLE `QuotationDraft`
    ADD CONSTRAINT `QuotationDraft_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
