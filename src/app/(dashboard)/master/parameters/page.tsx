import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import MasterParameterClient from "@/components/master/MasterParameterClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function MasterParameterPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "master.parameters");

  if (!allowed) {
    redirect("/dashboard");
  }

  const parameters = await prisma.analysisParameter.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section>
      <PageHeader
        eyebrow="Master Data"
        title="Master Parameter"
        subtitle="Kelola nama parameter pengujian laboratorium, satuan, metode uji, dan harga analisis."
      />

      <MasterParameterClient initialParameters={parameters} />
    </section>
  );
}
