-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `coaTemplateId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Sample` ADD COLUMN `coaTemplateId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SampleParameter` ADD COLUMN `templateParameterId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CoaTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CoaTemplate_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoaTemplateParameter` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `parameterId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `standard` VARCHAR(191) NULL,
    `limitValue` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `isRequired` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CoaTemplateParameter_templateId_parameterId_key`(`templateId`, `parameterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CoaTemplateParameter` ADD CONSTRAINT `CoaTemplateParameter_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `CoaTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoaTemplateParameter` ADD CONSTRAINT `CoaTemplateParameter_parameterId_fkey` FOREIGN KEY (`parameterId`) REFERENCES `AnalysisParameter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_coaTemplateId_fkey` FOREIGN KEY (`coaTemplateId`) REFERENCES `CoaTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sample` ADD CONSTRAINT `Sample_coaTemplateId_fkey` FOREIGN KEY (`coaTemplateId`) REFERENCES `CoaTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleParameter` ADD CONSTRAINT `SampleParameter_templateParameterId_fkey` FOREIGN KEY (`templateParameterId`) REFERENCES `CoaTemplateParameter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
