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

  // Jalankan paralel: query roleMenu hanya butuh roleId yang sudah ada di
  // session, jadi tak perlu menunggu query user selesai dulu. Ini memangkas
  // satu round-trip DB (~2 detik saat latensi tinggi) pada tiap load penuh.
  const [user, roleMenus] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      include: {
        role: true,
        customer: true,
      },
    }),
    prisma.roleMenu.findMany({
      where: {
        roleId: session.roleId,
        canView: true,
        menu: {
          isActive: true,
        },
      },
      include: {
        menu: true,
      },
    }),
  ]);

  if (!user || !user.isActive) {
    redirect("/login");
  }

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