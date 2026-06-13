import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import MasterParameterClient from "@/components/master/MasterParameterClient";

export default async function MasterParameterPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "master.parameters");

  if (!allowed) {
    redirect("/dashboard");
  }

  const parameters = await prisma.analysisParameter.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">Master Data</p>
        <h1 className="mt-2 text-4xl font-bold">Master Parameter</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Kelola parameter pengujian laboratorium seperti nama parameter,
          satuan, metode uji, dan harga analisis.
        </p>
      </div>

      <MasterParameterClient initialParameters={parameters} />
    </section>
  );
}