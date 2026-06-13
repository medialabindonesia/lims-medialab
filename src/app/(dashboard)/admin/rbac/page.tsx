import { prisma } from "@/lib/db";
import RbacPermissionTable from "@/components/rbac/RbacPermissionTable";

export default async function RbacPage() {
  const roles = await prisma.role.findMany({
    include: {
      roleMenus: {
        include: {
          menu: true,
        },
        orderBy: {
          menu: {
            sort: "asc",
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const menus = await prisma.menu.findMany({
    orderBy: {
      sort: "asc",
    },
  });

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">
          Administration
        </p>
        <h1 className="mt-2 text-4xl font-bold">RBAC Role & Menu</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Atur akses menu dan permission setiap role secara fleksibel. Role bisa dicentang untuk melihat menu, membuat data, update, delete, approve, validate, dan export.
        </p>
      </div>

      <RbacPermissionTable roles={roles} menus={menus} />
    </section>
  );
}