import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu, getMenuPermission } from "@/lib/rbac";
import { verifyStoredRevision } from "@/lib/revision-audit";
import RevisionAuditClient from "@/components/audit/RevisionAuditClient";

export default async function RevisionAuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await canAccessMenu(session.roleId, "audit.revisions"))) {
    redirect("/dashboard");
  }

  const [revisions, permission] = await Promise.all([
    prisma.auditRevision.findMany({
      orderBy: [{ createdAt: "desc" }, { revisionNo: "desc" }],
      take: 200,
    }),
    getMenuPermission(session.roleId, "audit.revisions"),
  ]);
  const quotationIds = revisions
    .filter((item) => item.entityType === "QUOTATION")
    .map((item) => item.entityId);
  const sampleIds = revisions
    .filter((item) => item.entityType === "LAB_RESULT")
    .map((item) => item.entityId);
  const [quotations, samples] = await Promise.all([
    prisma.quotation.findMany({
      where: { id: { in: quotationIds } },
      select: { id: true, quotationNo: true },
    }),
    prisma.sample.findMany({
      where: { id: { in: sampleIds } },
      select: { id: true, sampleNo: true },
    }),
  ]);
  const labels = new Map([
    ...quotations.map((item) => [item.id, item.quotationNo] as const),
    ...samples.map((item) => [item.id, item.sampleNo] as const),
  ]);

  const data = revisions.map((item) => ({
    ...item,
    entityLabel: labels.get(item.entityId) || item.entityId,
    integrityValid: verifyStoredRevision(item),
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#114DA5]">
          Quality & Audit
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">
          Revision Audit Trail
        </h1>
        <p className="mt-3 max-w-3xl text-slate-500">
          Bukti perubahan quotation dan hasil laboratorium. Restore tidak
          menghapus sejarah; sistem selalu membuat revisi terbaru.
        </p>
      </div>
      <RevisionAuditClient
        initialRevisions={JSON.parse(JSON.stringify(data))}
        canRestore={permission?.canUpdate === true}
      />
    </section>
  );
}
