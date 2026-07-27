-- Additive RBAC migration only: no existing role/menu permission is overwritten.
INSERT INTO `Menu`
  (`id`, `name`, `key`, `href`, `icon`, `parentId`, `sort`, `isActive`, `createdAt`, `updatedAt`)
SELECT
  REPLACE(UUID(), '-', ''),
  'Revision Audit Trail',
  'audit.revisions',
  '/audit/revisions',
  'History',
  NULL,
  68,
  true,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `Menu` WHERE `key` = 'audit.revisions'
);

INSERT INTO `RoleMenu`
  (`id`, `roleId`, `menuId`, `canView`, `canCreate`, `canUpdate`, `canDelete`,
   `canApprove`, `canValidate`, `canExport`)
SELECT
  REPLACE(UUID(), '-', ''),
  r.`id`,
  m.`id`,
  true,
  false,
  CASE
    WHEN r.`code` IN ('SUPER_ADMIN', 'SALES_STAFF', 'LAB_SUPERVISOR', 'LAB_MANAGER')
      THEN true
    ELSE false
  END,
  false,
  false,
  false,
  true
FROM `Role` r
JOIN `Menu` m ON m.`key` = 'audit.revisions'
WHERE r.`code` IN ('SUPER_ADMIN', 'SALES_STAFF', 'LAB_SUPERVISOR', 'LAB_MANAGER')
  AND NOT EXISTS (
    SELECT 1
    FROM `RoleMenu` rm
    WHERE rm.`roleId` = r.`id` AND rm.`menuId` = m.`id`
  );
