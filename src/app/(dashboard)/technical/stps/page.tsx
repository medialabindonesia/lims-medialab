import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { getTechnicalStpsPageData } from "@/lib/technical-page-data";
import TechnicalDocumentClient from "@/components/technical/TechnicalDocumentClient";

export default async function CreateStpsPage() {
  const session = await getSession();

  if (!session) redirect("/login");

  const allowed = await canAccessMenu(session.roleId, "technical.stps");

  if (!allowed) redirect("/dashboard");

  const data = await getTechnicalStpsPageData();

  return (
    <section className="min-h-screen">
      <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">Technical Flow</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
          Create STPS
        </h1>
        <p className="mt-3 max-w-3xl text-slate-500">
          Buat Surat Tugas Pengambilan Sampel berdasarkan COC yang sudah dibuat.
        </p>
      </div>

      <TechnicalDocumentClient
        mode="stps"
        initialQuotations={data.quotations}
      />
    </section>
  );
}