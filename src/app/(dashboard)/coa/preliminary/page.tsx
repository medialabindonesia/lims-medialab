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
      <CoaFlowClient
        mode="preliminary"
        initialSamples={data.samples}
        viewerRole={session.roleCode}
      />
    </section>
  );
}