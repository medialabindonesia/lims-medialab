import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getLabAnalysisPageData } from "@/lib/lab-analysis-page-data";
import LabAnalysisClient from "@/components/lab/LabAnalysisClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function ValidateResultsPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "lab.validate_results");

  if (!allowed) redirect("/dashboard");

  const data = await getLabAnalysisPageData();

  return (
    <section>
      <PageHeader eyebrow="Lab Analysis" title="Validate Results" subtitle="Manager melakukan validasi final terhadap hasil pengujian." />

      <LabAnalysisClient
        mode="validate"
        initialSampleParameters={data.sampleParameters}
        analysts={data.analysts}
      />
    </section>
  );
}
