import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import MotionHeader from "@/components/layout/MotionHeader";
import { KeyRound, ListChecks, Shield, Users } from "lucide-react";

export default async function AdminDashboardPage() {
  const [users, roles, menus, parameters] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.menu.count(),
    prisma.analysisParameter.count(),
  ]);

  return (
    <section>
      <MotionHeader
        eyebrow="Admin Dashboard"
        title="LIMS-Medialab Control Center"
        subtitle="Kelola user, role, akses menu, dan master data sistem LIMS secara fleksibel."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} title="Total User" value={users} icon={Users} description="Semua user sistem" />
        <StatCard index={1} title="Total Role" value={roles} icon={Shield} description="Role RBAC fleksibel" />
        <StatCard index={2} title="Total Menu" value={menus} icon={KeyRound} description="Menu bisa dicentang per role" />
        <StatCard index={3} title="Parameter Lab" value={parameters} icon={ListChecks} description="Master parameter analisis" />
      </div>
    </section>
  );
}