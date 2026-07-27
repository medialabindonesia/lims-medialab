-- Immutable document snapshots: master/template changes must never rewrite old reports.
ALTER TABLE `SampleParameter`
  ADD COLUMN IF NOT EXISTS `displayNameSnapshot` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `limitSnapshot` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `methodSnapshot` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `standardSnapshot` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `unitSnapshot` VARCHAR(191) NULL;

CREATE TABLE `AuditRevision` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` ENUM('QUOTATION', 'LAB_RESULT') NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `revisionNo` INTEGER NOT NULL,
  `action` ENUM('CREATED', 'UPDATED', 'STATUS_TRANSITION', 'RESTORED') NOT NULL,
  `snapshot` JSON NOT NULL,
  `checksum` CHAR(64) NOT NULL,
  `changeSummary` TEXT NULL,
  `reason` TEXT NULL,
  `actorId` VARCHAR(191) NULL,
  `actorNameSnapshot` VARCHAR(191) NULL,
  `actorRoleSnapshot` VARCHAR(191) NULL,
  `requestIp` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `sourceTicketId` VARCHAR(191) NULL,
  `parentRevisionId` VARCHAR(191) NULL,
  `restoredFromRevisionId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuditRevision_entityType_entityId_createdAt_idx` (`entityType`, `entityId`, `createdAt`),
  INDEX `AuditRevision_checksum_idx` (`checksum`),
  INDEX `AuditRevision_actorId_idx` (`actorId`),
  UNIQUE INDEX `AuditRevision_entityType_entityId_revisionNo_key` (`entityType`, `entityId`, `revisionNo`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- These support tables existed in environments made with db push, but were
-- missing from the historical migrations. IF NOT EXISTS keeps deploy safe for
-- those environments while also making a fresh migrate complete.
CREATE TABLE IF NOT EXISTS `FaqCategory` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(191) NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FaqCategory_slug_key` (`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FaqItem` (
  `id` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NOT NULL,
  `question` TEXT NOT NULL,
  `answer` TEXT NOT NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `helpfulCount` INTEGER NOT NULL DEFAULT 0,
  `notHelpfulCount` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `FaqItem_categoryId_idx` (`categoryId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FaqItem_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `FaqCategory` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SupportTicket` (
  `id` VARCHAR(191) NOT NULL,
  `ticketNo` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  `contextType` ENUM('GENERAL', 'QUOTATION', 'ORDER_SAMPLE', 'RESULT_REVISION') NOT NULL DEFAULT 'GENERAL',
  `contextLabel` VARCHAR(191) NULL,
  `quotationId` VARCHAR(191) NULL,
  `sampleId` VARCHAR(191) NULL,
  `revisionId` VARCHAR(191) NULL,
  `assignedToId` VARCHAR(191) NULL,
  `firstResponseAt` DATETIME(3) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `closedAt` DATETIME(3) NULL,
  `lastMessageAt` DATETIME(3) NULL,
  `rating` INTEGER NULL,
  `ratingComment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SupportTicket_ticketNo_key` (`ticketNo`),
  INDEX `SupportTicket_customerId_idx` (`customerId`),
  INDEX `SupportTicket_assignedToId_idx` (`assignedToId`),
  INDEX `SupportTicket_status_idx` (`status`),
  INDEX `SupportTicket_lastMessageAt_idx` (`lastMessageAt`),
  INDEX `SupportTicket_createdAt_idx` (`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SupportTicket_customerId_fkey`
    FOREIGN KEY (`customerId`) REFERENCES `Customer` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `FaqCategory` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_assignedToId_fkey`
    FOREIGN KEY (`assignedToId`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SupportTicket`
  ADD COLUMN IF NOT EXISTS `contextType` ENUM('GENERAL', 'QUOTATION', 'ORDER_SAMPLE', 'RESULT_REVISION') NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS `contextLabel` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `quotationId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `sampleId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `revisionId` VARCHAR(191) NULL;

CREATE INDEX IF NOT EXISTS `SupportTicket_contextType_idx` ON `SupportTicket` (`contextType`);
CREATE INDEX IF NOT EXISTS `SupportTicket_quotationId_idx` ON `SupportTicket` (`quotationId`);
CREATE INDEX IF NOT EXISTS `SupportTicket_sampleId_idx` ON `SupportTicket` (`sampleId`);
CREATE INDEX IF NOT EXISTS `SupportTicket_revisionId_idx` ON `SupportTicket` (`revisionId`);

CREATE TABLE IF NOT EXISTS `SupportMessage` (
  `id` VARCHAR(191) NOT NULL,
  `ticketId` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NULL,
  `senderRole` ENUM('CUSTOMER', 'AGENT', 'SYSTEM') NOT NULL,
  `body` TEXT NOT NULL,
  `isInternalNote` BOOLEAN NOT NULL DEFAULT false,
  `readByCustomerAt` DATETIME(3) NULL,
  `readByAgentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SupportMessage_ticketId_idx` (`ticketId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SupportMessage_ticketId_fkey`
    FOREIGN KEY (`ticketId`) REFERENCES `SupportTicket` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SupportMessage_senderId_fkey`
    FOREIGN KEY (`senderId`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupportAttachment` (
  `id` VARCHAR(191) NOT NULL,
  `messageId` VARCHAR(191) NOT NULL,
  `kind` ENUM('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT') NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `url` TEXT NOT NULL,
  `downloadUrl` TEXT NULL,
  `width` INTEGER NULL,
  `height` INTEGER NULL,
  `durationSeconds` DOUBLE NULL,
  `originalSizeBytes` INTEGER NULL,
  `isCompressed` BOOLEAN NOT NULL DEFAULT false,
  `checksum` CHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SupportAttachment_messageId_idx` (`messageId`),
  INDEX `SupportAttachment_kind_idx` (`kind`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SupportAttachment_messageId_fkey`
    FOREIGN KEY (`messageId`) REFERENCES `SupportMessage` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CannedReply` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `CannedReply_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuditRevision`
  ADD CONSTRAINT `AuditRevision_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `User` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `AuditRevision_parentRevisionId_fkey`
    FOREIGN KEY (`parentRevisionId`) REFERENCES `AuditRevision` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `AuditRevision_restoredFromRevisionId_fkey`
    FOREIGN KEY (`restoredFromRevisionId`) REFERENCES `AuditRevision` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SupportTicket`
  ADD CONSTRAINT `SupportTicket_quotationId_fkey`
    FOREIGN KEY (`quotationId`) REFERENCES `Quotation` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SupportTicket_sampleId_fkey`
    FOREIGN KEY (`sampleId`) REFERENCES `Sample` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SupportTicket_revisionId_fkey`
    FOREIGN KEY (`revisionId`) REFERENCES `AuditRevision` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
