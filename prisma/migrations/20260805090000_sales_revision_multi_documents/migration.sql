-- Sales revision workflow: explicit rejection/edit reasons and multi-document groups.
ALTER TABLE `Quotation`
    MODIFY `status` ENUM(
        'REQUESTED',
        'VERIFIED',
        'REVISION',
        'REJECTED',
        'NEGOTIATION',
        'APPROVED',
        'CONFIRMED',
        'PO_UPLOADED',
        'LTR_CREATED',
        'COC_CREATED'
    ) NOT NULL DEFAULT 'REQUESTED',
    ADD COLUMN `revisionReason` TEXT NULL,
    ADD COLUMN `rejectionReason` TEXT NULL,
    ADD COLUMN `postApprovalEditReason` TEXT NULL,
    ADD COLUMN `primaryLtrId` VARCHAR(191) NULL,
    ADD COLUMN `primaryCocId` VARCHAR(191) NULL;

-- One quotation can now produce multiple independently scoped LTR/COC files.
-- Add a replacement index first because MySQL will not drop the unique index
-- while it is still the only index supporting the quotation foreign key.
CREATE INDEX `Ltr_quotationId_idx` ON `Ltr`(`quotationId`);
DROP INDEX `Ltr_quotationId_key` ON `Ltr`;
ALTER TABLE `Ltr`
    ADD COLUMN `sequence` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `groupLabel` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Ltr_quotationId_sequence_key`
    ON `Ltr`(`quotationId`, `sequence`);

CREATE INDEX `Coc_quotationId_idx` ON `Coc`(`quotationId`);
DROP INDEX `Coc_quotationId_key` ON `Coc`;
ALTER TABLE `Coc`
    ADD COLUMN `ltrId` VARCHAR(191) NULL,
    ADD COLUMN `sequence` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `groupLabel` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Coc_quotationId_sequence_key`
    ON `Coc`(`quotationId`, `sequence`);
CREATE INDEX `Coc_ltrId_idx` ON `Coc`(`ltrId`);

-- Keep the historic one-to-one document pairing as the initial association.
UPDATE `Coc` c
INNER JOIN `Ltr` l ON l.`quotationId` = c.`quotationId`
SET c.`ltrId` = l.`id`
WHERE c.`ltrId` IS NULL;

UPDATE `Quotation` q
INNER JOIN `Ltr` l ON l.`quotationId` = q.`id` AND l.`sequence` = 1
SET q.`primaryLtrId` = l.`id`
WHERE q.`primaryLtrId` IS NULL;

UPDATE `Quotation` q
INNER JOIN `Coc` c ON c.`quotationId` = q.`id` AND c.`sequence` = 1
SET q.`primaryCocId` = c.`id`
WHERE q.`primaryCocId` IS NULL;

CREATE UNIQUE INDEX `Quotation_primaryLtrId_key` ON `Quotation`(`primaryLtrId`);
CREATE UNIQUE INDEX `Quotation_primaryCocId_key` ON `Quotation`(`primaryCocId`);

CREATE TABLE `LtrItem` (
    `id` VARCHAR(191) NOT NULL,
    `ltrId` VARCHAR(191) NOT NULL,
    `quotationItemId` VARCHAR(191) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `LtrItem_ltrId_quotationItemId_key`(`ltrId`, `quotationItemId`),
    INDEX `LtrItem_quotationItemId_idx`(`quotationItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CocItem` (
    `id` VARCHAR(191) NOT NULL,
    `cocId` VARCHAR(191) NOT NULL,
    `quotationItemId` VARCHAR(191) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `CocItem_cocId_quotationItemId_key`(`cocId`, `quotationItemId`),
    INDEX `CocItem_quotationItemId_idx`(`quotationItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Prisma cuid values are generated in the application, so the migration uses
-- deterministic unique legacy identifiers for the backfill rows.
INSERT INTO `LtrItem` (`id`, `ltrId`, `quotationItemId`, `sort`)
SELECT CONCAT('legacy-ltr-', LEFT(SHA2(CONCAT(l.`id`, ':', qi.`id`), 256), 25)),
       l.`id`, qi.`id`, 0
FROM `Ltr` l
INNER JOIN `QuotationItem` qi ON qi.`quotationId` = l.`quotationId`;

INSERT INTO `CocItem` (`id`, `cocId`, `quotationItemId`, `sort`)
SELECT CONCAT('legacy-coc-', LEFT(SHA2(CONCAT(c.`id`, ':', qi.`id`), 256), 25)),
       c.`id`, qi.`id`, 0
FROM `Coc` c
INNER JOIN `QuotationItem` qi ON qi.`quotationId` = c.`quotationId`;

ALTER TABLE `Coc`
    ADD CONSTRAINT `Coc_ltrId_fkey`
    FOREIGN KEY (`ltrId`) REFERENCES `Ltr`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Quotation`
    ADD CONSTRAINT `Quotation_primaryLtrId_fkey`
    FOREIGN KEY (`primaryLtrId`) REFERENCES `Ltr`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `Quotation_primaryCocId_fkey`
    FOREIGN KEY (`primaryCocId`) REFERENCES `Coc`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `LtrItem`
    ADD CONSTRAINT `LtrItem_ltrId_fkey`
    FOREIGN KEY (`ltrId`) REFERENCES `Ltr`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `LtrItem_quotationItemId_fkey`
    FOREIGN KEY (`quotationItemId`) REFERENCES `QuotationItem`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CocItem`
    ADD CONSTRAINT `CocItem_cocId_fkey`
    FOREIGN KEY (`cocId`) REFERENCES `Coc`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CocItem_quotationItemId_fkey`
    FOREIGN KEY (`quotationItemId`) REFERENCES `QuotationItem`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Separate operational monitoring screens for Sales and Sampling.
INSERT INTO `Menu` (`id`, `name`, `key`, `href`, `icon`, `sort`, `isActive`, `createdAt`, `updatedAt`)
SELECT 'menu-sales-monitoring', 'Sales Monitoring', 'sales.monitoring', '/sales/monitoring', 'BarChart3', 41, TRUE, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Menu` WHERE `key` = 'sales.monitoring');

INSERT INTO `Menu` (`id`, `name`, `key`, `href`, `icon`, `sort`, `isActive`, `createdAt`, `updatedAt`)
SELECT 'menu-sampling-schedule', 'Sampling Schedule', 'sales.sampling_schedule', '/sales/sampling-schedule', 'CalendarRange', 42, TRUE, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Menu` WHERE `key` = 'sales.sampling_schedule');

INSERT INTO `RoleMenu` (`id`, `roleId`, `menuId`, `canView`, `canCreate`, `canUpdate`, `canDelete`, `canApprove`, `canValidate`, `canExport`)
SELECT CONCAT('rm-monitor-', LEFT(SHA2(CONCAT(r.`id`, m.`id`), 256), 20)), r.`id`, m.`id`, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE
FROM `Role` r
INNER JOIN `Menu` m ON m.`key` = 'sales.monitoring'
WHERE r.`code` IN ('SUPER_ADMIN', 'SALES_STAFF', 'SALES_MANAGER_DIRECTOR')
  AND NOT EXISTS (SELECT 1 FROM `RoleMenu` rm WHERE rm.`roleId` = r.`id` AND rm.`menuId` = m.`id`);

INSERT INTO `RoleMenu` (`id`, `roleId`, `menuId`, `canView`, `canCreate`, `canUpdate`, `canDelete`, `canApprove`, `canValidate`, `canExport`)
SELECT CONCAT('rm-sampling-', LEFT(SHA2(CONCAT(r.`id`, m.`id`), 256), 20)), r.`id`, m.`id`, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE
FROM `Role` r
INNER JOIN `Menu` m ON m.`key` = 'sales.sampling_schedule'
WHERE r.`code` IN ('SUPER_ADMIN', 'SALES_STAFF', 'SALES_MANAGER_DIRECTOR', 'TECHNICAL')
  AND NOT EXISTS (SELECT 1 FROM `RoleMenu` rm WHERE rm.`roleId` = r.`id` AND rm.`menuId` = m.`id`);
