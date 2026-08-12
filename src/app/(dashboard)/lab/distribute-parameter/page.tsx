import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getSamplePageData } from "@/lib/sample-page-data";
import SampleFlowClient from "@/components/sample/SampleFlowClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function DistributeParameterPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(
    session.roleId,
    "lab.distribute_parameter"
  );

  if (!allowed) {
    redirect("/dashboard");
  }

  const data = await getSamplePageData();

  return (
    <section>
      <PageHeader eyebrow="Sample Flow" title="Distribute Parameter" subtitle="Bagikan parameter sample kepada analyst berdasarkan kompetensi dan beban kerja." />

      <SampleFlowClient
        mode="distribute"
        initialSamples={data.samples}
        quotationsReady={data.quotationsReady}
        analysts={data.analysts}
      />
    </section>
  );
}
