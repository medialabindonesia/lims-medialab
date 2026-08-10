-- AlterTable
ALTER TABLE `Quotation`
    MODIFY `status` ENUM('REQUESTED', 'VERIFIED', 'REVISION', 'REJECTED', 'NEGOTIATION', 'APPROVED', 'SENT', 'CONFIRMED', 'PO_UPLOADED', 'LTR_CREATED', 'COC_CREATED') NOT NULL DEFAULT 'REQUESTED',
    ADD COLUMN `tatBusinessDays` INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN `tatPriceMultiplier` DOUBLE NOT NULL DEFAULT 1,
    ADD COLUMN `tatSurchargeAmount` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `RegulationParameter`
    ADD COLUMN `limitValue2` VARCHAR(191) NULL,
    ADD COLUMN `samplingMethod` VARCHAR(191) NULL,
    ADD COLUMN `sampleMatrix` VARCHAR(191) NULL,
    ADD COLUMN `sampleSize` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Consultant` (
    `id` VARCHAR(191) NOT NULL,
    `code` CHAR(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `contactPerson` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Consultant_code_key`(`code`),
    INDEX `Consultant_isActive_name_idx`(`isActive`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Customer`
    ADD COLUMN `customerCode` VARCHAR(191) NULL,
    ADD COLUMN `customerType` ENUM('DIRECT', 'CONSULTANT') NOT NULL DEFAULT 'DIRECT',
    ADD COLUMN `centerCode` CHAR(3) NOT NULL DEFAULT '001',
    ADD COLUMN `joinYear` INTEGER NULL,
    ADD COLUMN `sequenceNo` INTEGER NULL,
    ADD COLUMN `consultantId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Customer_customerCode_key` ON `Customer`(`customerCode`);
CREATE INDEX `Customer_customerType_centerCode_joinYear_idx` ON `Customer`(`customerType`, `centerCode`, `joinYear`);
CREATE INDEX `Customer_consultantId_idx` ON `Customer`(`consultantId`);

-- Beri identitas DC kepada customer lama secara deterministik. Nomor urut
-- direset per tahun join (createdAt), sesuai format DC.001.YY00001.
UPDATE `Customer` AS customer
JOIN (
    SELECT ranked.`id`, ranked.`joinYear`, ranked.`sequenceNo`
    FROM (
        SELECT
            `id`,
            YEAR(`createdAt`) AS `joinYear`,
            ROW_NUMBER() OVER (
                PARTITION BY YEAR(`createdAt`)
                ORDER BY `createdAt`, `id`
            ) AS `sequenceNo`
        FROM `Customer`
    ) AS ranked
) AS generated ON generated.`id` = customer.`id`
SET
    customer.`joinYear` = generated.`joinYear`,
    customer.`sequenceNo` = generated.`sequenceNo`,
    customer.`customerCode` = CONCAT(
        'DC.001.',
        RIGHT(CAST(generated.`joinYear` AS CHAR), 2),
        LPAD(generated.`sequenceNo`, 5, '0')
    )
WHERE customer.`customerCode` IS NULL;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `leadNo` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `status` ENUM('NEW', 'QUALIFYING', 'SURVEY_REQUIRED', 'SURVEY_IN_PROGRESS', 'READY_FOR_QUOTATION', 'QUOTATION_CREATED', 'NOT_SUPPORTED', 'LOST') NOT NULL DEFAULT 'NEW',
    `capabilityStatus` ENUM('PENDING', 'SUPPORTED', 'NEEDS_SURVEY', 'NOT_SUPPORTED') NOT NULL DEFAULT 'PENDING',
    `requestedTests` TEXT NOT NULL,
    `customerKnowsScope` BOOLEAN NOT NULL DEFAULT false,
    `contactName` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `quotationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lead_leadNo_key`(`leadNo`),
    UNIQUE INDEX `Lead_quotationId_key`(`quotationId`),
    INDEX `Lead_customerId_status_idx`(`customerId`, `status`),
    INDEX `Lead_assignedToId_status_idx`(`assignedToId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Survey` (
    `id` VARCHAR(191) NOT NULL,
    `surveyNo` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `status` ENUM('RECOMMENDED', 'SCHEDULED', 'IN_PROGRESS', 'RESUME_READY', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'RECOMMENDED',
    `scope` TEXT NOT NULL,
    `location` VARCHAR(191) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `conductedAt` DATETIME(3) NULL,
    `resumeSummary` TEXT NULL,
    `resumeFileUrl` VARCHAR(191) NULL,
    `recommendedById` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Survey_surveyNo_key`(`surveyNo`),
    INDEX `Survey_leadId_status_idx`(`leadId`, `status`),
    INDEX `Survey_assignedToId_status_idx`(`assignedToId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyParameter` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `regulationParameterId` VARCHAR(191) NULL,
    `parameterName` VARCHAR(191) NOT NULL,
    `regulationName` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `duration` VARCHAR(191) NULL,
    `samplingLocation` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `SurveyParameter_surveyId_sort_idx`(`surveyId`, `sort`),
    INDEX `SurveyParameter_regulationParameterId_idx`(`regulationParameterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationEmail` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `toEmail` VARCHAR(191) NOT NULL,
    `ccEmails` JSON NULL,
    `subject` VARCHAR(191) NOT NULL,
    `bodyText` TEXT NOT NULL,
    `attachmentManifest` JSON NULL,
    `createdById` VARCHAR(191) NULL,
    `sentById` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuotationEmail_quotationId_createdAt_idx`(`quotationId`, `createdAt`),
    INDEX `QuotationEmail_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_consultantId_fkey` FOREIGN KEY (`consultantId`) REFERENCES `Consultant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Survey` ADD CONSTRAINT `Survey_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Survey` ADD CONSTRAINT `Survey_recommendedById_fkey` FOREIGN KEY (`recommendedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Survey` ADD CONSTRAINT `Survey_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyParameter` ADD CONSTRAINT `SurveyParameter_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `Survey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SurveyParameter` ADD CONSTRAINT `SurveyParameter_regulationParameterId_fkey` FOREIGN KEY (`regulationParameterId`) REFERENCES `RegulationParameter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationEmail` ADD CONSTRAINT `QuotationEmail_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `QuotationEmail` ADD CONSTRAINT `QuotationEmail_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `QuotationEmail` ADD CONSTRAINT `QuotationEmail_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
