import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getLabAnalysisPageData } from "@/lib/lab-analysis-page-data";
import LabAnalysisClient from "@/components/lab/LabAnalysisClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function EnterResultsPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "lab.enter_results");

  if (!allowed) redirect("/dashboard");

  const data = await getLabAnalysisPageData();

  return (
    <section>
      <PageHeader eyebrow="Lab Analysis" title="Enter Results" subtitle="Analyst menginput hasil analisis parameter." />

      <LabAnalysisClient
        mode="enter"
        initialSampleParameters={data.sampleParameters}
        analysts={data.analysts}
      />
    </section>
  );
}
