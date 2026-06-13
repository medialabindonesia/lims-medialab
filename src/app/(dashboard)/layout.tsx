import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserMenus } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
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
    },
  });

  if (!user) {
    redirect("/login");
  }

  const menus = await getUserMenus(user.roleId);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        roleName: user.role.name,
      }}
      menus={menus}
    >
      {children}
    </AppShell>
  );
}