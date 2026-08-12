import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getLabAnalysisPageData } from "@/lib/lab-analysis-page-data";
import LabAnalysisClient from "@/components/lab/LabAnalysisClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function ConductAnalysisPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "lab.conduct_analysis");

  if (!allowed) redirect("/dashboard");

  const data = await getLabAnalysisPageData();

  return (
    <section>
      <PageHeader eyebrow="Lab Analysis" title="Conduct Analysis" subtitle="Analyst memulai pengujian parameter yang sudah dibagikan oleh Lab Admin." />

      <LabAnalysisClient
        mode="conduct"
        initialSampleParameters={data.sampleParameters}
        analysts={data.analysts}
      />
    </section>
  );
}
