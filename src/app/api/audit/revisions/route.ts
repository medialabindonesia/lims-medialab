import { NextResponse } from "next/server";
import { RevisionEntityType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-permission";
import { verifyStoredRevision } from "@/lib/revision-audit";

export async function GET(request: Request) {
  const permission = await requireApiPermission("audit.revisions", "canView");
  if (!permission.allowed) return permission.response;

  const url = new URL(request.url);
  const rawType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const entityType =
    rawType && Object.values(RevisionEntityType).includes(rawType as RevisionEntityType)
      ? (rawType as RevisionEntityType)
      : undefined;

  const revisions = await prisma.auditRevision.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { revisionNo: "desc" }],
    take: entityId ? 100 : 200,
  });

  return NextResponse.json({
    revisions: revisions.map((revision) => ({
      ...revision,
      integrityValid: verifyStoredRevision(revision),
    })),
  });
}
