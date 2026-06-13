import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

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

  return NextResponse.json({
    message: "Permission role berhasil diupdate",
  });
}