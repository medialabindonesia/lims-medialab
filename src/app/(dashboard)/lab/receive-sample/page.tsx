import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getSamplePageData } from "@/lib/sample-page-data";
import SampleFlowClient from "@/components/sample/SampleFlowClient";

export default async function ReceiveSamplePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "lab.receive_sample");

  if (!allowed) {
    redirect("/dashboard");
  }

  const data = await getSamplePageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Sample Flow</p>
        <h1 className="mt-2 text-4xl font-bold">Receive Sample</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Buat sample dari quotation yang sudah COC_CREATED, lalu lab menerima
          sample tersebut.
        </p>
      </div>

      <SampleFlowClient
        mode="receive"
        initialSamples={data.samples}
        quotationsReady={data.quotationsReady}
        analysts={data.analysts}
      />
    </section>
  );
}