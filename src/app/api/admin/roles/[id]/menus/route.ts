import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  computeCapabilityCoverage,
  orphanedCapabilities,
  superAdminOnlyCapabilities,
} from "@/lib/workflow-capabilities";

type PermissionInput = {
  menuId: string;
  canView?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canValidate?: boolean;
  canExport?: boolean;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session || session.roleCode !== "SUPER_ADMIN") {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const { id: roleId } = await context.params;

  if (!roleId) {
    return NextResponse.json(
      { message: "Role ID tidak ditemukan" },
      { status: 400 }
    );
  }

  const role = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
  });

  if (!role) {
    return NextResponse.json(
      { message: "Role tidak ditemukan" },
      { status: 404 }
    );
  }

  const body = await request.json();

  const permissions: PermissionInput[] = Array.isArray(body.permissions)
    ? body.permissions
    : [];

  // Gerbang alur kerja: hitung dulu keadaan SETELAH perubahan ini diterapkan.
  // Kalau ada langkah wajib yang jadi tidak dipegang role mana pun, simpanan
  // ditolak — bukan disimpan lalu diberi peringatan, karena begitu tersimpan
  // pesanan bisa langsung macet tanpa jejak penyebabnya.
  const coverage = await computeCapabilityCoverage(prisma, {
    roleId,
    permissions,
  });

  const orphaned = orphanedCapabilities(coverage);

  if (orphaned.length > 0) {
    return NextResponse.json(
      {
        message:
          orphaned.length === 1
            ? `Perubahan ini membuat langkah "${orphaned[0].capability.label}" tidak dipegang role mana pun. ${orphaned[0].capability.consequence}`
            : `Perubahan ini membuat ${orphaned.length} langkah alur kerja tidak dipegang role mana pun.`,
        blockedCapabilities: orphaned.map((item) => ({
          label: item.capability.label,
          stage: item.capability.stage,
          menuKey: item.capability.menuKey,
          action: item.capability.action,
          consequence: item.capability.consequence,
        })),
      },
      { status: 409 }
    );
  }

  for (const item of permissions) {
    if (!item.menuId) continue;

    await prisma.roleMenu.upsert({
      where: {
        roleId_menuId: {
          roleId,
          menuId: item.menuId,
        },
      },
      update: {
        canView: Boolean(item.canView),
        canCreate: Boolean(item.canCreate),
        canUpdate: Boolean(item.canUpdate),
        canDelete: Boolean(item.canDelete),
        canApprove: Boolean(item.canApprove),
        canValidate: Boolean(item.canValidate),
        canExport: Boolean(item.canExport),
      },
      create: {
        roleId,
        menuId: item.menuId,
        canView: Boolean(item.canView),
        canCreate: Boolean(item.canCreate),
        canUpdate: Boolean(item.canUpdate),
        canDelete: Boolean(item.canDelete),
        canApprove: Boolean(item.canApprove),
        canValidate: Boolean(item.canValidate),
        canExport: Boolean(item.canExport),
      },
    });
  }

  // Dihitung ulang setelah tersimpan: peringatan bahwa sebuah langkah kini
  // hanya bisa dikerjakan Super Admin. Ini tidak memblokir — alurnya secara
  // teknis masih jalan — tetapi hampir selalu bukan yang dimaksudkan admin.
  const finalCoverage = await computeCapabilityCoverage(prisma);
  const superAdminOnly = superAdminOnlyCapabilities(finalCoverage);

  return NextResponse.json({
    message: "Permission role berhasil diupdate",
    warnings: superAdminOnly.map((item) => ({
      label: item.capability.label,
      stage: item.capability.stage,
      message: `"${item.capability.label}" kini hanya bisa dikerjakan Super Admin.`,
    })),
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session || session.roleCode !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: roleId } = await context.params;

  const coverage = await computeCapabilityCoverage(prisma);

  return NextResponse.json({
    roleId,
    capabilities: coverage.map((item) => ({
      label: item.capability.label,
      stage: item.capability.stage,
      menuKey: item.capability.menuKey,
      action: item.capability.action,
      consequence: item.capability.consequence,
      holders: item.holders.map((holder) => holder.name),
      isOrphaned: item.isOrphaned,
      isSuperAdminOnly: item.isSuperAdminOnly,
    })),
  });
}