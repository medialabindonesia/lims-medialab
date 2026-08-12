import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getSamplePageData } from "@/lib/sample-page-data";
import SampleFlowClient from "@/components/sample/SampleFlowClient";
import PageHeader from "@/components/layout/PageHeader";

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
      <PageHeader eyebrow="Sample Flow" title="Receive Sample" subtitle="Buat sample dari quotation yang sudah COC_CREATED, lalu catat penerimaannya di laboratorium." />

      <SampleFlowClient
        mode="receive"
        initialSamples={data.samples}
        quotationsReady={data.quotationsReady}
        analysts={data.analysts}
      />
    </section>
  );
}
