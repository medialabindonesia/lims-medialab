-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `orderCode` VARCHAR(191) NULL,
    ADD COLUMN `pricingStatus` ENUM('UNPRICED', 'PARTIAL', 'PRICED') NOT NULL DEFAULT 'UNPRICED';

-- AlterTable
ALTER TABLE `QuotationItem` ADD COLUMN `basePrice` DOUBLE NULL,
    ADD COLUMN `durationId` VARCHAR(191) NULL,
    ADD COLUMN `groupId` VARCHAR(191) NULL,
    ADD COLUMN `regulationParameterId` VARCHAR(191) NULL,
    MODIFY `price` DOUBLE NULL;

-- CreateTable
CREATE TABLE `Matrix` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Matrix_code_key`(`code`),
    INDEX `Matrix_parentId_idx`(`parentId`),
    INDEX `Matrix_isActive_sort_idx`(`isActive`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Regulation` (
    `id` VARCHAR(191) NOT NULL,
    `matrixId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Regulation_code_key`(`code`),
    INDEX `Regulation_matrixId_idx`(`matrixId`),
    INDEX `Regulation_isActive_sort_idx`(`isActive`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SamplingDuration` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `minutes` INTEGER NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SamplingDuration_code_key`(`code`),
    INDEX `SamplingDuration_isActive_sort_idx`(`isActive`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegulationParameter` (
    `id` VARCHAR(191) NOT NULL,
    `regulationId` VARCHAR(191) NOT NULL,
    `parameterId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `limitValue` VARCHAR(191) NULL,
    `basePrice` DOUBLE NULL,
    `isAccredited` BOOLEAN NOT NULL DEFAULT true,
    `defaultSelected` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RegulationParameter_parameterId_idx`(`parameterId`),
    UNIQUE INDEX `RegulationParameter_regulationId_parameterId_key`(`regulationId`, `parameterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegulationParameterDuration` (
    `id` VARCHAR(191) NOT NULL,
    `regulationParameterId` VARCHAR(191) NOT NULL,
    `durationId` VARCHAR(191) NOT NULL,
    `limitValue` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `RegulationParameterDuration_durationId_idx`(`durationId`),
    UNIQUE INDEX `RegulationParameterDuration_regulationParameterId_durationId_key`(`regulationParameterId`, `durationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationGroup` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,
    `matrixId` VARCHAR(191) NULL,
    `regulationId` VARCHAR(191) NULL,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuotationGroup_quotationId_idx`(`quotationId`),
    INDEX `QuotationGroup_matrixId_idx`(`matrixId`),
    INDEX `QuotationGroup_regulationId_idx`(`regulationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationGroupLocation` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `customerSampleId` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `QuotationGroupLocation_groupId_idx`(`groupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Quotation_orderCode_key` ON `Quotation`(`orderCode`);

-- CreateIndex
CREATE INDEX `QuotationItem_quotationId_idx` ON `QuotationItem`(`quotationId`);

-- CreateIndex
CREATE INDEX `QuotationItem_groupId_idx` ON `QuotationItem`(`groupId`);

-- CreateIndex
CREATE INDEX `QuotationItem_parameterId_idx` ON `QuotationItem`(`parameterId`);

-- CreateIndex
CREATE INDEX `QuotationItem_regulationParameterId_idx` ON `QuotationItem`(`regulationParameterId`);

-- CreateIndex
CREATE INDEX `QuotationItem_durationId_idx` ON `QuotationItem`(`durationId`);

-- AddForeignKey
ALTER TABLE `Matrix` ADD CONSTRAINT `Matrix_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Matrix`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Regulation` ADD CONSTRAINT `Regulation_matrixId_fkey` FOREIGN KEY (`matrixId`) REFERENCES `Matrix`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegulationParameter` ADD CONSTRAINT `RegulationParameter_regulationId_fkey` FOREIGN KEY (`regulationId`) REFERENCES `Regulation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegulationParameter` ADD CONSTRAINT `RegulationParameter_parameterId_fkey` FOREIGN KEY (`parameterId`) REFERENCES `AnalysisParameter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegulationParameterDuration` ADD CONSTRAINT `RegulationParameterDuration_regulationParameterId_fkey` FOREIGN KEY (`regulationParameterId`) REFERENCES `RegulationParameter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegulationParameterDuration` ADD CONSTRAINT `RegulationParameterDuration_durationId_fkey` FOREIGN KEY (`durationId`) REFERENCES `SamplingDuration`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationGroup` ADD CONSTRAINT `QuotationGroup_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationGroup` ADD CONSTRAINT `QuotationGroup_matrixId_fkey` FOREIGN KEY (`matrixId`) REFERENCES `Matrix`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationGroup` ADD CONSTRAINT `QuotationGroup_regulationId_fkey` FOREIGN KEY (`regulationId`) REFERENCES `Regulation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationGroupLocation` ADD CONSTRAINT `QuotationGroupLocation_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `QuotationGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `QuotationGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_regulationParameterId_fkey` FOREIGN KEY (`regulationParameterId`) REFERENCES `RegulationParameter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_durationId_fkey` FOREIGN KEY (`durationId`) REFERENCES `SamplingDuration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
