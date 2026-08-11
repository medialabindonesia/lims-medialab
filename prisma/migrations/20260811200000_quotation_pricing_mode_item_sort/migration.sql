-- Bedakan harga item lama dari harga paket resmi, termasuk saat harga kosong.
ALTER TABLE `QuotationGroup`
    ADD COLUMN `pricingMode` ENUM('ITEM', 'PACKAGE') NOT NULL DEFAULT 'ITEM';

-- Grup yang sudah memiliki unit price pasti merupakan paket. Grup legacy atau
-- yang masih ambigu tetap ITEM; setelah migration, API selalu menulis mode.
UPDATE `QuotationGroup`
SET `pricingMode` = 'PACKAGE'
WHERE `unitPrice` IS NOT NULL;

-- Menjamin urutan parameter stabil pada PDF/Excel dan dokumen turunan.
ALTER TABLE `QuotationItem`
    ADD COLUMN `sort` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `QuotationItem_groupId_sort_id_idx`
    ON `QuotationItem`(`groupId`, `sort`, `id`);
