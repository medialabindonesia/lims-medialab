import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getTechnicalCocPageData } from "@/lib/technical-page-data";
import TechnicalDocumentClient from "@/components/technical/TechnicalDocumentClient";

export default async function CreateCocPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "technical.coc");

  if (!allowed) redirect("/dashboard");

  const data = await getTechnicalCocPageData();

  return (
    <section className="min-h-screen">
      <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">Technical Flow</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
          Create COC
        </h1>
        <p className="mt-3 max-w-3xl text-slate-500">
          Buat Chain of Custody berdasarkan quotation dan LTR yang sudah selesai.
        </p>
      </div>

      <TechnicalDocumentClient
        mode="coc"
        initialQuotations={data.quotations}
      />
    </section>
  );
}