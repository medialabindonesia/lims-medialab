import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getTechnicalCocPageData } from "@/lib/technical-page-data";
import TechnicalDocumentClient from "@/components/technical/TechnicalDocumentClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function CreateCocPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "technical.coc");

  if (!allowed) redirect("/dashboard");

  const data = await getTechnicalCocPageData();

  return (
    <section className="min-h-screen">
      <PageHeader
        eyebrow="Technical Flow"
        title="Create COC"
        subtitle="Buat Chain of Custody berdasarkan quotation dan LTR yang sudah selesai."
      />

      <TechnicalDocumentClient
        mode="coc"
        initialQuotations={data.quotations}
      />
    </section>
  );
}
