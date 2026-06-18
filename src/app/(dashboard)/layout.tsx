import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    include: {
      role: true,
      customer: true,
    },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  const roleMenus = await prisma.roleMenu.findMany({
    where: {
      roleId: user.roleId,
      canView: true,
      menu: {
        isActive: true,
      },
    },
    include: {
      menu: true,
    },
  });

  const menus = roleMenus
    .map((item) => item.menu)
    .sort((a, b) => a.sort - b.sort);

  return (
    <DashboardShell
      session={{
        userId: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        roleCode: user.role.code,
        customerId: user.customerId,
        customerName: user.customer?.name || null,
      }}
      menus={JSON.parse(JSON.stringify(menus))}
    >
      {children}
    </DashboardShell>
  );
}