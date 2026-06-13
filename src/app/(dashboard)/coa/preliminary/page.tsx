import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getCoaPageData } from "@/lib/coa-page-data";
import CoaFlowClient from "@/components/coa/CoaFlowClient";

export default async function PreliminaryCoaPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "coa.preliminary");

  if (!allowed) redirect("/dashboard");

  const data = await getCoaPageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">COA Flow</p>
        <h1 className="mt-2 text-4xl font-bold">Preliminary COA</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Generate preliminary COA berdasarkan hasil lab yang sudah tervalidasi.
        </p>
      </div>

      <CoaFlowClient mode="preliminary" initialSamples={data.samples} />
    </section>
  );
}