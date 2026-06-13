import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import MasterCoaTemplateClient from "@/components/master/MasterCoaTemplateClient";

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
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">Master Data</p>
        <h1 className="mt-2 text-4xl font-bold">Master COA Template</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Kelola jenis template COA seperti Air Ambient, ISPU, Air Limbah,
          Emisi, dan parameter yang akan tampil di COA.
        </p>
      </div>

      <MasterCoaTemplateClient
        initialTemplates={JSON.parse(JSON.stringify(templates))}
        parameters={JSON.parse(JSON.stringify(parameters))}
      />
    </section>
  );
}