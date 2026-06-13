import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getLabAnalysisPageData } from "@/lib/lab-analysis-page-data";
import LabAnalysisClient from "@/components/lab/LabAnalysisClient";

export default async function ReviewResultsPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "lab.review_results");

  if (!allowed) redirect("/dashboard");

  const data = await getLabAnalysisPageData();

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">Lab Analysis</p>
        <h1 className="mt-2 text-4xl font-bold">Review Results</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Supervisor melakukan review terhadap hasil yang telah diinput.
        </p>
      </div>

      <LabAnalysisClient
        mode="review"
        initialSampleParameters={data.sampleParameters}
        analysts={data.analysts}
      />
    </section>
  );
}