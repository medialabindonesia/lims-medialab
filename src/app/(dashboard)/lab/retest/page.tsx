import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getLabAnalysisPageData } from "@/lib/lab-analysis-page-data";
import LabAnalysisClient from "@/components/lab/LabAnalysisClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function RetestPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "lab.ask_retest");

  if (!allowed) redirect("/dashboard");

  const data = await getLabAnalysisPageData();

  return (
    <section>
      <PageHeader eyebrow="Lab Analysis" title="Ask Retest" subtitle="Supervisor atau Manager meminta pengujian ulang jika hasil belum sesuai." />

      <LabAnalysisClient
        mode="retest"
        initialSampleParameters={data.sampleParameters}
        analysts={data.analysts}
      />
    </section>
  );
}
