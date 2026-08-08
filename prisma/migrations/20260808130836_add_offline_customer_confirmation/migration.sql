-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `confirmedAt` DATETIME(3) NULL,
    ADD COLUMN `confirmedById` VARCHAR(191) NULL,
    ADD COLUMN `confirmedOffline` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `offlineConfirmationChannel` ENUM('EMAIL', 'WHATSAPP', 'PHONE', 'MEETING', 'SIGNED_DOCUMENT', 'OTHER') NULL,
    ADD COLUMN `offlineConfirmationNote` TEXT NULL;
