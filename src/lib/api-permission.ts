import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type PermissionAction =
  | "canView"
  | "canCreate"
  | "canUpdate"
  | "canDelete"
  | "canApprove"
  | "canValidate"
  | "canExport";

type PermissionCheck = {
  menuKey: string;
  action: PermissionAction;
};

export async function requireApiPermission(
  menuKey: string,
  action: PermissionAction
) {
  return requireAnyApiPermission([{ menuKey, action }]);
}

export async function requireAnyApiPermission(checks: PermissionCheck[]) {
  const session = await getSession();

  if (!session) {
    return {
      allowed: false as const,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  for (const check of checks) {
    const access = await prisma.roleMenu.findFirst({
      where: {
        roleId: session.roleId,
        menu: {
          key: check.menuKey,
          isActive: true,
        },
        canView: true,
        [check.action]: true,
      },
    });

    if (access) {
      return {
        allowed: true as const,
        response: null,
        session,
      };
    }
  }

  return {
    allowed: false as const,
    response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    session,
  };
}