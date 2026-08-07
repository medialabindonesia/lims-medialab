import { createHash } from "node:crypto";
import type {
  AuditRevision,
  Prisma,
  RevisionAction,
  RevisionEntityType,
} from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";

type DbClient = Prisma.TransactionClient;

export type QuotationRevisionSnapshot = {
  entityType: "QUOTATION";
  quotation: {
    id: string;
    quotationNo: string;
    customerId: string;
    coaTemplateId: string | null;
    status: string;
    totalAmount: number;
    note: string | null;
    quotationDate: string;
    validUntil: string | null;
    samplingBy: string | null;
    testingObjective: string | null;
    tatRequested: string | null;
    samplingCost: number;
    vatPercent: number;
    vatAmount: number;
    grandTotal: number;
    paymentTerm: string | null;
    termsNote: string | null;
    items: Array<{
      parameterId: string;
      qty: number;
      /// null berarti harga belum ditetapkan, bukan gratis.
      price: number | null;
      description: string | null;
      customerSampleId: string | null;
      samplingLocation: string | null;
      regulationMatrix: string | null;
      durationSampling: string | null;
      method: string | null;
    }>;
  };
};

export type LabResultRevisionSnapshot = {
  entityType: "LAB_RESULT";
  sample: {
    id: string;
    sampleNo: string;
    status: string;
    quotationId: string | null;
    customerId: string;
    coaTemplateId: string | null;
    parameters: Array<{
      id: string;
      parameterId: string;
      templateParameterId: string | null;
      analystId: string | null;
      status: string;
      resultValue: string | null;
      resultNote: string | null;
      retestReason: string | null;
      displayNameSnapshot: string | null;
      unitSnapshot: string | null;
      methodSnapshot: string | null;
      standardSnapshot: string | null;
      limitSnapshot: string | null;
    }>;
  };
};

export type RevisionSnapshot =
  | QuotationRevisionSnapshot
  | LabResultRevisionSnapshot;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

export function revisionChecksum(snapshot: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(snapshot)))
    .digest("hex");
}

export async function buildQuotationSnapshot(
  db: DbClient,
  quotationId: string
): Promise<QuotationRevisionSnapshot> {
  const quotation = await db.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { items: { orderBy: { id: "asc" } } },
  });

  return {
    entityType: "QUOTATION",
    quotation: {
      id: quotation.id,
      quotationNo: quotation.quotationNo,
      customerId: quotation.customerId,
      coaTemplateId: quotation.coaTemplateId,
      status: quotation.status,
      totalAmount: quotation.totalAmount,
      note: quotation.note,
      quotationDate: quotation.quotationDate.toISOString(),
      validUntil: quotation.validUntil?.toISOString() ?? null,
      samplingBy: quotation.samplingBy,
      testingObjective: quotation.testingObjective,
      tatRequested: quotation.tatRequested,
      samplingCost: quotation.samplingCost,
      vatPercent: quotation.vatPercent,
      vatAmount: quotation.vatAmount,
      grandTotal: quotation.grandTotal,
      paymentTerm: quotation.paymentTerm,
      termsNote: quotation.termsNote,
      items: quotation.items.map((item) => ({
        parameterId: item.parameterId,
        qty: item.qty,
        price: item.price,
        description: item.description,
        customerSampleId: item.customerSampleId,
        samplingLocation: item.samplingLocation,
        regulationMatrix: item.regulationMatrix,
        durationSampling: item.durationSampling,
        method: item.method,
      })),
    },
  };
}

export async function buildLabResultSnapshot(
  db: DbClient,
  sampleId: string
): Promise<LabResultRevisionSnapshot> {
  const sample = await db.sample.findUniqueOrThrow({
    where: { id: sampleId },
    include: { parameters: { orderBy: { id: "asc" } } },
  });

  return {
    entityType: "LAB_RESULT",
    sample: {
      id: sample.id,
      sampleNo: sample.sampleNo,
      status: sample.status,
      quotationId: sample.quotationId,
      customerId: sample.customerId,
      coaTemplateId: sample.coaTemplateId,
      parameters: sample.parameters.map((item) => ({
        id: item.id,
        parameterId: item.parameterId,
        templateParameterId: item.templateParameterId,
        analystId: item.analystId,
        status: item.status,
        resultValue: item.resultValue,
        resultNote: item.resultNote,
        retestReason: item.retestReason,
        displayNameSnapshot: item.displayNameSnapshot,
        unitSnapshot: item.unitSnapshot,
        methodSnapshot: item.methodSnapshot,
        standardSnapshot: item.standardSnapshot,
        limitSnapshot: item.limitSnapshot,
      })),
    },
  };
}

async function actorSnapshot(db: DbClient, session: SessionPayload) {
  const actor = await db.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  });

  return {
    actorId: session.userId,
    actorNameSnapshot: actor?.name ?? session.email,
    actorRoleSnapshot: actor?.role.name ?? session.roleCode,
  };
}

function requestAuditMeta(request?: Request) {
  if (!request) return {};
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    requestIp: forwarded?.split(",")[0]?.trim() || null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function createAuditRevision(
  db: DbClient,
  input: {
    entityType: RevisionEntityType;
    entityId: string;
    action: RevisionAction;
    snapshot: RevisionSnapshot;
    session: SessionPayload;
    request?: Request;
    reason?: string | null;
    changeSummary?: string | null;
    sourceTicketId?: string | null;
    restoredFromRevisionId?: string | null;
  }
) {
  const latest = await db.auditRevision.findFirst({
    where: { entityType: input.entityType, entityId: input.entityId },
    orderBy: { revisionNo: "desc" },
  });
  const checksum = revisionChecksum(input.snapshot);

  // Hindari revision noise: snapshot identik tetap tercatat hanya bila restore.
  if (
    latest?.checksum === checksum &&
    input.action !== "RESTORED"
  ) {
    return latest;
  }

  return db.auditRevision.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      revisionNo: (latest?.revisionNo ?? 0) + 1,
      action: input.action,
      snapshot: input.snapshot as unknown as Prisma.InputJsonValue,
      checksum,
      reason: input.reason || null,
      changeSummary: input.changeSummary || null,
      sourceTicketId: input.sourceTicketId || null,
      parentRevisionId: latest?.id ?? null,
      restoredFromRevisionId: input.restoredFromRevisionId || null,
      ...(await actorSnapshot(db, input.session)),
      ...requestAuditMeta(input.request),
    },
  });
}

export async function captureQuotationRevision(
  db: DbClient,
  input: Omit<
    Parameters<typeof createAuditRevision>[1],
    "entityType" | "snapshot"
  >
) {
  return createAuditRevision(db, {
    ...input,
    entityType: "QUOTATION",
    snapshot: await buildQuotationSnapshot(db, input.entityId),
  });
}

export async function captureLabResultRevision(
  db: DbClient,
  input: Omit<
    Parameters<typeof createAuditRevision>[1],
    "entityType" | "snapshot"
  >
) {
  return createAuditRevision(db, {
    ...input,
    entityType: "LAB_RESULT",
    snapshot: await buildLabResultSnapshot(db, input.entityId),
  });
}

export function verifyStoredRevision(revision: AuditRevision) {
  return revisionChecksum(revision.snapshot) === revision.checksum;
}
