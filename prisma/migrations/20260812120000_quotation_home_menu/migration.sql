-- Menu "Quotation" (papan pantau semua status) beserta izinnya.
--
-- Ditulis sebagai migration, bukan hanya di `prisma/seed.ts`, karena full seed
-- tidak dijalankan saat deployment. Tanpa berkas ini menu baru hanya muncul di
-- database yang kebetulan pernah di-seed ulang, dan tidak pernah muncul di
-- environment marketing maupun production.
--
-- Sifatnya menambah saja: tidak ada menu atau izin yang ditimpa maupun dihapus,
-- sehingga aman dijalankan pada database yang sudah berisi data.

INSERT INTO `Menu`
  (`id`, `name`, `key`, `href`, `icon`, `parentId`, `sort`, `isActive`, `createdAt`, `updatedAt`)
SELECT
  REPLACE(UUID(), '-', ''),
  'Quotation',
  'quotation.home',
  '/quotations/home',
  'BarChart3',
  NULL,
  29,
  true,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `Menu` WHERE `key` = 'quotation.home'
);

-- Halaman ini hanya memantau dan mencari; seluruh aksi tetap dikerjakan di
-- halaman Request/Verify/Revise/Approve. Karena itu izinnya cukup `canView`
-- dan `canExport`, tanpa create/update/delete/approve.
INSERT INTO `RoleMenu`
  (`id`, `roleId`, `menuId`, `canView`, `canCreate`, `canUpdate`, `canDelete`,
   `canApprove`, `canValidate`, `canExport`)
SELECT
  REPLACE(UUID(), '-', ''),
  r.`id`,
  m.`id`,
  true,
  false,
  false,
  false,
  false,
  false,
  true
FROM `Role` r
JOIN `Menu` m ON m.`key` = 'quotation.home'
WHERE r.`code` IN (
    'SUPER_ADMIN',
    'SALES_STAFF',
    'SALES_MANAGER_DIRECTOR',
    'CUSTOMER_ENGAGEMENT'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `RoleMenu` rm
    WHERE rm.`roleId` = r.`id` AND rm.`menuId` = m.`id`
  );
