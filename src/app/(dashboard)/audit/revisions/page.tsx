import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu, getMenuPermission } from "@/lib/rbac";
import { verifyStoredRevision } from "@/lib/revision-audit";
import RevisionAuditClient from "@/components/audit/RevisionAuditClient";
import PageHeader from "@/components/layout/PageHeader";

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
      <PageHeader
        eyebrow="Quality & Audit"
        title="Revision Audit Trail"
        subtitle="Bukti perubahan quotation dan hasil laboratorium. Restore tidak menghapus sejarah; sistem selalu membuat revisi terbaru."
      />
      <RevisionAuditClient
        initialRevisions={JSON.parse(JSON.stringify(data))}
        canRestore={permission?.canUpdate === true}
      />
    </section>
  );
}
