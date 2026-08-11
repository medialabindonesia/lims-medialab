-- Struktur komersial surat penawaran aktif (MI-FR-MKT-8.2-01.01 Rev.07):
-- harga paket per grup, multi-regulasi, serta rincian sampling/dokumen.

ALTER TABLE `Quotation`
    ADD COLUMN `additionalCost` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `discountLabel` VARCHAR(191) NULL,
    ADD COLUMN `emailSendLock` VARCHAR(191) NULL,
    ADD COLUMN `emailSendLockedAt` DATETIME(3) NULL;

CREATE INDEX `Quotation_emailSendLock_emailSendLockedAt_idx`
    ON `Quotation`(`emailSendLock`, `emailSendLockedAt`);

ALTER TABLE `QuotationGroup`
    ADD COLUMN `unitPrice` DOUBLE NULL,
    ADD COLUMN `basePrice` DOUBLE NULL;

CREATE TABLE `QuotationGroupRegulation` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `regulationId` VARCHAR(191) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `QuotationGroupRegulation_groupId_regulationId_key`(`groupId`, `regulationId`),
    INDEX `QuotationGroupRegulation_regulationId_idx`(`regulationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QuotationChargeItem` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `category` ENUM('SAMPLING', 'DOCUMENT', 'OTHER') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `qty` DOUBLE NOT NULL DEFAULT 1,
    `unit` VARCHAR(191) NULL,
    `unitPrice` DOUBLE NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuotationChargeItem_quotationId_category_sort_idx`(`quotationId`, `category`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `QuotationGroupRegulation`
    ADD CONSTRAINT `QuotationGroupRegulation_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `QuotationGroup`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `QuotationGroupRegulation`
    ADD CONSTRAINT `QuotationGroupRegulation_regulationId_fkey`
    FOREIGN KEY (`regulationId`) REFERENCES `Regulation`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `QuotationChargeItem`
    ADD CONSTRAINT `QuotationChargeItem_quotationId_fkey`
    FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Isi primary regulation lama juga masuk ke join table agar export baru dapat
-- membaca quotation lama tanpa mengubah makna dokumennya.
INSERT INTO `QuotationGroupRegulation` (`id`, `groupId`, `regulationId`, `sort`)
SELECT CONCAT('qgr_', `id`), `id`, `regulationId`, 10
FROM `QuotationGroup`
WHERE `regulationId` IS NOT NULL;

-- Menu dan RBAC minimum dibuat sebagai data migration agar production tidak
-- bergantung pada full seed (yang juga mereset akun demo/password).
INSERT INTO `Menu`
    (`id`, `name`, `key`, `href`, `icon`, `parentId`, `sort`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('menu_master_marketing', 'Matriks, Regulasi & Harga', 'master.marketing', '/master/marketing', 'Layers', NULL, 23, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('menu_marketing_leads', 'Lead & Survey', 'marketing.leads', '/marketing/leads', 'ClipboardList', NULL, 24, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `href` = VALUES(`href`),
    `icon` = VALUES(`icon`),
    `sort` = VALUES(`sort`),
    `isActive` = true,
    `updatedAt` = CURRENT_TIMESTAMP(3);

INSERT INTO `RoleMenu`
    (`id`, `roleId`, `menuId`, `canView`, `canCreate`, `canUpdate`, `canDelete`, `canApprove`, `canValidate`, `canExport`)
SELECT
    CONCAT('rm_mkt_', LEFT(MD5(CONCAT(role.`id`, ':', menu.`id`)), 24)),
    role.`id`,
    menu.`id`,
    true,
    CASE
      WHEN role.`code` IN ('SUPER_ADMIN', 'SALES_STAFF', 'CUSTOMER_SERVICE') THEN true
      ELSE false
    END,
    CASE
      WHEN role.`code` IN ('SUPER_ADMIN', 'SALES_STAFF', 'CUSTOMER_SERVICE', 'TECHNICAL') THEN true
      ELSE false
    END,
    CASE WHEN role.`code` = 'SUPER_ADMIN' THEN true ELSE false END,
    CASE WHEN role.`code` = 'SUPER_ADMIN' THEN true ELSE false END,
    CASE WHEN role.`code` = 'SUPER_ADMIN' THEN true ELSE false END,
    true
FROM `Role` AS role
JOIN `Menu` AS menu
  ON menu.`key` = 'marketing.leads'
WHERE role.`code` IN ('SUPER_ADMIN', 'SALES_STAFF', 'CUSTOMER_SERVICE', 'TECHNICAL')
ON DUPLICATE KEY UPDATE
    `canView` = VALUES(`canView`),
    `canCreate` = VALUES(`canCreate`),
    `canUpdate` = VALUES(`canUpdate`),
    `canDelete` = VALUES(`canDelete`),
    `canApprove` = VALUES(`canApprove`),
    `canValidate` = VALUES(`canValidate`),
    `canExport` = VALUES(`canExport`);

INSERT INTO `RoleMenu`
    (`id`, `roleId`, `menuId`, `canView`, `canCreate`, `canUpdate`, `canDelete`, `canApprove`, `canValidate`, `canExport`)
SELECT
    CONCAT('rm_mkt_', LEFT(MD5(CONCAT(role.`id`, ':', menu.`id`)), 24)),
    role.`id`,
    menu.`id`,
    true,
    true,
    true,
    CASE WHEN role.`code` = 'SUPER_ADMIN' THEN true ELSE false END,
    CASE WHEN role.`code` = 'SUPER_ADMIN' THEN true ELSE false END,
    CASE WHEN role.`code` = 'SUPER_ADMIN' THEN true ELSE false END,
    true
FROM `Role` AS role
JOIN `Menu` AS menu
  ON menu.`key` = 'master.marketing'
WHERE role.`code` IN ('SUPER_ADMIN', 'SALES_STAFF')
ON DUPLICATE KEY UPDATE
    `canView` = VALUES(`canView`),
    `canCreate` = VALUES(`canCreate`),
    `canUpdate` = VALUES(`canUpdate`),
    `canDelete` = VALUES(`canDelete`),
    `canApprove` = VALUES(`canApprove`),
    `canValidate` = VALUES(`canValidate`),
    `canExport` = VALUES(`canExport`);
