-- AlterTable
ALTER TABLE `Coc` ADD COLUMN `abnormalCondition` VARCHAR(191) NULL,
    ADD COLUMN `customerCode` VARCHAR(191) NULL,
    ADD COLUMN `customerEmailCoa` VARCHAR(191) NULL,
    ADD COLUMN `deliveryMethod` ENUM('MEDIALAB_SAMPLING', 'CUSTOMER_DELIVERY', 'COURIER', 'OTHER') NULL,
    ADD COLUMN `estimatedCoaDate` DATETIME(3) NULL,
    ADD COLUMN `plannedSamplingEnd` DATETIME(3) NULL,
    ADD COLUMN `plannedSamplingStart` DATETIME(3) NULL,
    ADD COLUMN `sampleConditionMethod` VARCHAR(191) NULL,
    ADD COLUMN `sampleConditionReceived` VARCHAR(191) NULL,
    ADD COLUMN `sampleConditionSamplingInfo` VARCHAR(191) NULL,
    ADD COLUMN `samplerName` VARCHAR(191) NULL,
    ADD COLUMN `specialInstruction` VARCHAR(191) NULL,
    ADD COLUMN `tatRequested` ENUM('NORMAL', 'URGENT', 'TOP_URGENT') NULL;

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `addressLine1` VARCHAR(191) NULL,
    ADD COLUMN `addressLine2` VARCHAR(191) NULL,
    ADD COLUMN `billingAddressLine1` VARCHAR(191) NULL,
    ADD COLUMN `billingAddressLine2` VARCHAR(191) NULL,
    ADD COLUMN `billingCompany` VARCHAR(191) NULL,
    ADD COLUMN `billingContactPerson` VARCHAR(191) NULL,
    ADD COLUMN `billingEmail` VARCHAR(191) NULL,
    ADD COLUMN `billingPhone` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `contactPerson` VARCHAR(191) NULL,
    ADD COLUMN `documentAddressLine1` VARCHAR(191) NULL,
    ADD COLUMN `documentAddressLine2` VARCHAR(191) NULL,
    ADD COLUMN `documentCompany` VARCHAR(191) NULL,
    ADD COLUMN `documentContactPerson` VARCHAR(191) NULL,
    ADD COLUMN `documentPhone` VARCHAR(191) NULL,
    ADD COLUMN `npwp` VARCHAR(191) NULL,
    ADD COLUMN `npwpAddress` VARCHAR(191) NULL,
    ADD COLUMN `province` VARCHAR(191) NULL,
    ADD COLUMN `recipientEmail1` VARCHAR(191) NULL,
    ADD COLUMN `recipientEmail2` VARCHAR(191) NULL,
    ADD COLUMN `recipientEmail3` VARCHAR(191) NULL,
    ADD COLUMN `recipientEmail4` VARCHAR(191) NULL,
    ADD COLUMN `samplingAddressLine1` VARCHAR(191) NULL,
    ADD COLUMN `samplingAddressLine2` VARCHAR(191) NULL,
    ADD COLUMN `samplingCompany` VARCHAR(191) NULL,
    ADD COLUMN `samplingContactPerson` VARCHAR(191) NULL,
    ADD COLUMN `samplingPhone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `grandTotal` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `paymentTerm` VARCHAR(191) NULL,
    ADD COLUMN `quotationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `samplingBy` ENUM('MEDIALAB', 'CUSTOMER', 'THIRD_PARTY') NULL,
    ADD COLUMN `samplingCost` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `tatRequested` ENUM('NORMAL', 'URGENT', 'TOP_URGENT') NULL,
    ADD COLUMN `termsNote` VARCHAR(191) NULL,
    ADD COLUMN `testingObjective` ENUM('ROUTINE_MONITORING', 'SUPERVISION', 'CASE_PROOF', 'RESEARCH', 'OTHER') NULL,
    ADD COLUMN `validUntil` DATETIME(3) NULL,
    ADD COLUMN `vatAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `vatPercent` DOUBLE NOT NULL DEFAULT 11;

-- AlterTable
ALTER TABLE `QuotationItem` ADD COLUMN `customerSampleId` VARCHAR(191) NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `durationSampling` VARCHAR(191) NULL,
    ADD COLUMN `method` VARCHAR(191) NULL,
    ADD COLUMN `regulationMatrix` VARCHAR(191) NULL,
    ADD COLUMN `samplingLocation` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Stps` (
    `id` VARCHAR(191) NOT NULL,
    `stpsNo` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `cocId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'ISSUED') NOT NULL DEFAULT 'DRAFT',
    `technicalManagerName` VARCHAR(191) NULL,
    `technicalManagerPosition` VARCHAR(191) NULL,
    `issuedDate` DATETIME(3) NULL,
    `sampler1Name` VARCHAR(191) NULL,
    `sampler1Position` VARCHAR(191) NULL,
    `sampler2Name` VARCHAR(191) NULL,
    `sampler2Position` VARCHAR(191) NULL,
    `sampler3Name` VARCHAR(191) NULL,
    `sampler3Position` VARCHAR(191) NULL,
    `sampler4Name` VARCHAR(191) NULL,
    `sampler4Position` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Stps_stpsNo_key`(`stpsNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Stps` ADD CONSTRAINT `Stps_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
