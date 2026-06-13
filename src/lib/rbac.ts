import { prisma } from "@/lib/db";

export async function getUserMenus(roleId: string) {
  const access = await prisma.roleMenu.findMany({
    where: {
      roleId,
      canView: true,
      menu: {
        isActive: true,
      },
    },
    include: {
      menu: true,
    },
    orderBy: {
      menu: {
        sort: "asc",
      },
    },
  });

  return access.map((item) => ({
    id: item.menu.id,
    name: item.menu.name,
    key: item.menu.key,
    href: item.menu.href,
    icon: item.menu.icon,
    canCreate: item.canCreate,
    canUpdate: item.canUpdate,
    canDelete: item.canDelete,
    canApprove: item.canApprove,
    canValidate: item.canValidate,
    canExport: item.canExport,
  }));
}

export async function canAccessMenu(roleId: string, menuKey: string) {
  const access = await prisma.roleMenu.findFirst({
    where: {
      roleId,
      menu: {
        key: menuKey,
      },
      canView: true,
    },
  });

  return Boolean(access);
}