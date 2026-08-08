import type { Prisma } from "@prisma/client";
import type { PermissionAction } from "@/lib/api-permission";

/**
 * Kemampuan yang menjadi simpul wajib alur kerja LIMS.
 *
 * PEMISAHAN TIGA LAPIS
 * --------------------
 * 1. Alur kerja itu sendiri (REQUESTED -> VERIFIED -> APPROVED -> ...)
 *    tertanam di kode dan tidak bisa dimatikan siapa pun. Itu hukum bisnis,
 *    bukan setelan.
 * 2. RBAC hanya menentukan ROLE MANA yang memegang tiap langkah. RBAC
 *    menjawab "siapa", bukan "apakah langkah ini ada".
 * 3. Berkas ini adalah lapis ketiga: memastikan setiap langkah wajib selalu
 *    dipegang minimal satu role aktif.
 *
 * Tanpa lapis ketiga, meng-uncheck satu kotak di halaman RBAC bisa membuat
 * pesanan macet selamanya tanpa ada yang bisa menyelamatkannya — dan tidak
 * ada pesan kesalahan apa pun yang menjelaskan kenapa.
 *
 * Daftar di bawah diturunkan dari pemeriksaan yang benar-benar ditegakkan
 * route API, bukan dari perkiraan. Bila sebuah route mengubah syarat
 * izinnya, daftar ini harus ikut disesuaikan.
 */

export type WorkflowCapability = {
  menuKey: string;
  action: PermissionAction;
  /** Nama langkahnya dalam bahasa yang dimengerti admin. */
  label: string;
  /** Tahap alur, dipakai mengelompokkan tampilan. */
  stage: string;
  /** Apa yang macet bila tidak ada yang memegangnya. */
  consequence: string;
};

export const WORKFLOW_CAPABILITIES: WorkflowCapability[] = [
  {
    menuKey: "quotation.request",
    action: "canCreate",
    label: "Buat Quotation",
    stage: "Quotation",
    consequence: "Tidak ada yang bisa membuat penawaran baru.",
  },
  {
    menuKey: "quotation.verify",
    action: "canValidate",
    label: "Verifikasi Quotation",
    stage: "Quotation",
    consequence: "Quotation baru akan tertahan selamanya di status REQUESTED.",
  },
  {
    menuKey: "quotation.approve",
    action: "canApprove",
    label: "Approve Quotation",
    stage: "Quotation",
    consequence: "Quotation tertahan di status VERIFIED dan tidak pernah jadi pesanan.",
  },
  {
    menuKey: "quotation.revise",
    action: "canUpdate",
    label: "Revisi Quotation",
    stage: "Quotation",
    consequence: "Quotation yang ditolak atau diminta revisi tidak bisa diperbaiki.",
  },
  {
    menuKey: "sales.ltr",
    action: "canCreate",
    label: "Terbitkan LTR",
    stage: "Dokumen",
    consequence: "Pesanan yang sudah disetujui tidak bisa diterbitkan LTR-nya.",
  },
  {
    menuKey: "technical.coc",
    action: "canCreate",
    label: "Terbitkan CoC",
    stage: "Dokumen",
    consequence: "Sampling tidak bisa dijalankan karena CoC tidak pernah terbit.",
  },
  {
    menuKey: "lab.receive_sample",
    action: "canCreate",
    label: "Terima Sampel",
    stage: "Laboratorium",
    consequence: "Sampel yang datang tidak bisa masuk ke alur analisis.",
  },
  {
    menuKey: "coa.preliminary",
    action: "canCreate",
    label: "Buat COA Preliminary",
    stage: "COA",
    consequence: "Hasil analisis tidak bisa dituangkan menjadi COA.",
  },
  {
    menuKey: "coa.final",
    action: "canCreate",
    label: "Buat COA Final",
    stage: "COA",
    consequence: "COA final tidak pernah terbit untuk customer.",
  },
  {
    menuKey: "coa.final",
    action: "canApprove",
    label: "Approve COA Final",
    stage: "COA",
    consequence: "COA final tertahan tanpa persetujuan dan tidak bisa dikirim.",
  },
  {
    menuKey: "finance.create_invoice",
    action: "canView",
    label: "Buat Invoice",
    stage: "Keuangan",
    consequence: "Pekerjaan yang selesai tidak pernah ditagihkan.",
  },
  {
    menuKey: "finance.approve_invoice",
    action: "canView",
    label: "Approve Invoice",
    stage: "Keuangan",
    consequence: "Invoice tertahan dan tidak pernah sampai ke customer.",
  },
];

export type CapabilityHolder = {
  roleId: string;
  code: string;
  name: string;
};

export type CapabilityCoverage = {
  capability: WorkflowCapability;
  holders: CapabilityHolder[];
  /** Tidak ada role sama sekali yang bisa menjalankan langkah ini. */
  isOrphaned: boolean;
  /**
   * Hanya Super Admin yang memegangnya. Secara teknis alur masih jalan,
   * tetapi role bisnis yang seharusnya mengerjakannya sudah kehilangan akses.
   */
  isSuperAdminOnly: boolean;
};

const SUPER_ADMIN_CODE = "SUPER_ADMIN";

/** Bentuk perubahan yang sedang diajukan halaman RBAC, belum tersimpan. */
export type ProposedRolePermissions = {
  roleId: string;
  permissions: Array<
    { menuId: string } & Partial<Record<PermissionAction, boolean>>
  >;
};

type DbClient = Pick<Prisma.TransactionClient, "menu" | "role" | "roleMenu">;

/**
 * Menghitung siapa saja yang memegang tiap langkah wajib.
 *
 * Bila `proposed` diberikan, perhitungan dilakukan atas keadaan SETELAH
 * perubahan itu diterapkan — tanpa benar-benar menyimpannya. Inilah yang
 * membuat halaman RBAC bisa menolak simpanan yang merusak alur, bukan sekadar
 * melaporkan kerusakan setelah terjadi.
 */
export async function computeCapabilityCoverage(
  db: DbClient,
  proposed?: ProposedRolePermissions
): Promise<CapabilityCoverage[]> {
  const menuKeys = [
    ...new Set(WORKFLOW_CAPABILITIES.map((item) => item.menuKey)),
  ];

  const [menus, roles, roleMenus] = await Promise.all([
    db.menu.findMany({
      where: { key: { in: menuKeys }, isActive: true },
      select: { id: true, key: true },
    }),
    db.role.findMany({ select: { id: true, code: true, name: true } }),
    db.roleMenu.findMany({
      where: { menu: { key: { in: menuKeys }, isActive: true } },
      select: {
        roleId: true,
        menuId: true,
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canApprove: true,
        canValidate: true,
        canExport: true,
      },
    }),
  ]);

  const menuIdByKey = new Map(menus.map((menu) => [menu.key, menu.id]));
  const roleById = new Map(roles.map((role) => [role.id, role]));

  // Salinan izin yang bisa ditimpa oleh usulan perubahan.
  type Grant = Record<PermissionAction, boolean>;
  const grants = new Map<string, Grant>();

  const keyOf = (roleId: string, menuId: string) => `${roleId}::${menuId}`;

  for (const entry of roleMenus) {
    grants.set(keyOf(entry.roleId, entry.menuId), {
      canView: entry.canView,
      canCreate: entry.canCreate,
      canUpdate: entry.canUpdate,
      canDelete: entry.canDelete,
      canApprove: entry.canApprove,
      canValidate: entry.canValidate,
      canExport: entry.canExport,
    });
  }

  if (proposed) {
    const relevantMenuIds = new Set(menuIdByKey.values());

    for (const item of proposed.permissions) {
      if (!item.menuId || !relevantMenuIds.has(item.menuId)) continue;

      // Route penyimpanan memakai Boolean(...) pada setiap kolom, sehingga
      // field yang tidak dikirim tersimpan sebagai false. Perhitungan di sini
      // harus meniru perilaku itu persis agar penilaiannya tidak meleset.
      grants.set(keyOf(proposed.roleId, item.menuId), {
        canView: Boolean(item.canView),
        canCreate: Boolean(item.canCreate),
        canUpdate: Boolean(item.canUpdate),
        canDelete: Boolean(item.canDelete),
        canApprove: Boolean(item.canApprove),
        canValidate: Boolean(item.canValidate),
        canExport: Boolean(item.canExport),
      });
    }
  }

  return WORKFLOW_CAPABILITIES.map((capability) => {
    const menuId = menuIdByKey.get(capability.menuKey);
    const holders: CapabilityHolder[] = [];

    if (menuId) {
      for (const role of roles) {
        const grant = grants.get(keyOf(role.id, menuId));

        // requireAnyApiPermission mensyaratkan canView DAN aksinya.
        if (!grant?.canView || !grant[capability.action]) continue;

        holders.push({ roleId: role.id, code: role.code, name: role.name });
      }
    }

    const nonSuperAdmin = holders.filter(
      (holder) => holder.code !== SUPER_ADMIN_CODE
    );

    return {
      capability,
      holders,
      isOrphaned: holders.length === 0,
      isSuperAdminOnly: holders.length > 0 && nonSuperAdmin.length === 0,
    };
  }).map((coverage) => ({
    ...coverage,
    holders: coverage.holders.map((holder) => ({
      ...holder,
      name: roleById.get(holder.roleId)?.name ?? holder.name,
    })),
  }));
}

export function orphanedCapabilities(coverage: CapabilityCoverage[]) {
  return coverage.filter((item) => item.isOrphaned);
}

export function superAdminOnlyCapabilities(coverage: CapabilityCoverage[]) {
  return coverage.filter((item) => item.isSuperAdminOnly);
}
