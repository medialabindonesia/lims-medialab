import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import AdminUsersClient from "@/components/admin/AdminUsersClient";

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
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Administration</p>
        <h1 className="mt-2 text-4xl font-bold">Users</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Kelola akun login, pilih role, hubungkan user ke customer, dan reset
          password user.
        </p>
      </div>

      <AdminUsersClient
        initialUsers={JSON.parse(JSON.stringify(users))}
        roles={JSON.parse(JSON.stringify(roles))}
        customers={JSON.parse(JSON.stringify(customers))}
      />
    </section>
  );
}