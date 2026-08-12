import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import MasterCoaTemplateClient from "@/components/master/MasterCoaTemplateClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function MasterCoaTemplatePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "master.coa_templates");

  if (!allowed) {
    redirect("/dashboard");
  }

  const [templates, parameters] = await Promise.all([
    prisma.coaTemplate.findMany({
      include: {
        parameters: {
          include: {
            parameter: true,
          },
          orderBy: {
            sort: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.analysisParameter.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <section>
      <PageHeader
        eyebrow="Master Data"
        title="Master COA Template"
        subtitle="Kelola template COA serta parameter yang akan tampil pada dokumen hasil."
      />

      <MasterCoaTemplateClient
        initialTemplates={JSON.parse(JSON.stringify(templates))}
        parameters={JSON.parse(JSON.stringify(parameters))}
      />
    </section>
  );
}
