import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getCoaPageData } from "@/lib/coa-page-data";
import CoaFlowClient from "@/components/coa/CoaFlowClient";

export default async function FinalCoaPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "coa.final");

  if (!allowed) redirect("/dashboard");

  const data = await getCoaPageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">COA Flow</p>
        <h1 className="mt-2 text-4xl font-bold">Final COA</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Generate final COA setelah preliminary COA dikonfirmasi customer.
        </p>
      </div>

      <CoaFlowClient mode="final" initialSamples={data.samples} />
    </section>
  );
}