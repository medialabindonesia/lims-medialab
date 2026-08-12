import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getTechnicalStpsPageData } from "@/lib/technical-page-data";
import TechnicalDocumentClient from "@/components/technical/TechnicalDocumentClient";
import PageHeader from "@/components/layout/PageHeader";

export default async function CreateStpsPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "technical.stps");

  if (!allowed) redirect("/dashboard");

  const data = await getTechnicalStpsPageData();

  return (
    <section className="min-h-screen">
      <PageHeader
        eyebrow="Technical Flow"
        title="Create STPS"
        subtitle="Buat Surat Tugas Pengambilan Sampel berdasarkan COC yang sudah dibuat."
      />

      <TechnicalDocumentClient
        mode="stps"
        initialQuotations={data.quotations}
      />
    </section>
  );
}
