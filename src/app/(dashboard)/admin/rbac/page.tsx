import { prisma } from "@/lib/db";
import RbacPermissionTable from "@/components/rbac/RbacPermissionTable";
import PageHeader from "@/components/layout/PageHeader";

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
      <PageHeader
        eyebrow="Administrasi"
        title="RBAC Role & Menu"
        subtitle="Atur akses menu dan permission setiap role secara fleksibel tanpa memutus alur kerja wajib."
      />

      <RbacPermissionTable roles={roles} menus={menus} />
    </section>
  );
}
