import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import AdminUsersClient from "@/components/admin/AdminUsersClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function AdminUsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "admin.users");

  if (!allowed) {
    redirect("/dashboard");
  }

  const [users, roles, customers] = await Promise.all([
    prisma.user.findMany({
      include: {
        role: true,
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.customer.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <section>
      <PageHeader
        eyebrow="Administrasi"
        title="Users"
        subtitle="Kelola akun login, pilih role, hubungkan user ke customer, dan reset password user."
      />

      <AdminUsersClient
        initialUsers={JSON.parse(JSON.stringify(users))}
        roles={JSON.parse(JSON.stringify(roles))}
        customers={JSON.parse(JSON.stringify(customers))}
      />
    </section>
  );
}
