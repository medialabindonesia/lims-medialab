import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
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
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Admin Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">LIMS-Medialab Control Center</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Kelola user, role, akses menu, dan master data sistem LIMS secara fleksibel.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total User" value={users} icon={Users} description="Semua user sistem" />
        <StatCard title="Total Role" value={roles} icon={Shield} description="Role RBAC fleksibel" />
        <StatCard title="Total Menu" value={menus} icon={KeyRound} description="Menu bisa dicentang per role" />
        <StatCard title="Parameter Lab" value={parameters} icon={ListChecks} description="Master parameter analisis" />
      </div>
    </section>
  );
}