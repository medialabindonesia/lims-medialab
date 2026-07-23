import { prisma } from "@/lib/db";
import { computeMilestone, type OrderSummary } from "@/lib/order-tracking";

/**
 * Detail pesanan lengkap (hulu ke hilir) untuk satu Quotation milik customer.
 * Menyusun: ringkasan tahap (pakai computeMilestone yang sama dengan kartu di
 * dashboard), timeline kronologis bertimestamp, daftar dokumen yang bisa
 * di-preview/unduh customer, tabel parameter + hasil, dan rincian biaya.
 *
 * Timeline dibangun dari SUMBER BERTIMESTAMP yang konkret (createdAt tiap
 * entitas + WorkflowLog fase-sample) — bukan dari status semata — supaya
 * setiap peristiwa punya waktu asli, mirip riwayat pesanan e-commerce.
 */

// ---- Label maps (ID) ----

const TAT_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  TOP_URGENT: "Top Urgent",
};

const SAMPLING_BY_LABEL: Record<string, string> = {
  MEDIALAB: "Sampling oleh Medialab",
  CUSTOMER: "Dikirim oleh Customer",
  THIRD_PARTY: "Pihak Ketiga",
};

const OBJECTIVE_LABEL: Record<string, string> = {
  ROUTINE_MONITORING: "Pemantauan Rutin",
  SUPERVISION: "Pengawasan",
  CASE_PROOF: "Pembuktian Kasus",
  RESEARCH: "Penelitian",
  OTHER: "Lainnya",
};

const RESULT_STATUS_LABEL: Record<string, string> = {
  WAITING: "Menunggu",
  IN_PROGRESS: "Sedang Dianalisis",
  ENTERED: "Hasil Masuk",
  REVIEWED: "Ditinjau",
  VERIFIED: "Diverifikasi",
  VALIDATED: "Tervalidasi",
  RETEST: "Uji Ulang",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Sedang Disiapkan",
  WAITING_APPROVAL: "Menunggu Approval Internal",
  APPROVED: "Disetujui, Segera Dikirim",
  SENT: "Terkirim, Menunggu Pembayaran",
  PAYMENT_SUBMITTED: "Bukti Bayar Sedang Diverifikasi",
  PAID: "Lunas",
};

/** Map role.code pelaku aksi ke label tim yang ramah customer. */
function actorTeamLabel(roleCode: string | null | undefined): string {
  if (!roleCode) return "Tim Medialab";
  if (roleCode === "CUSTOMER_ENGAGEMENT") return "Anda";
  if (roleCode.startsWith("SALES")) return "Tim Sales";
  if (roleCode === "TECHNICAL") return "Tim Teknis";
  if (roleCode.startsWith("LAB")) return "Tim Lab";
  if (roleCode === "FINANCE") return "Tim Finance";
  if (roleCode === "SUPER_ADMIN") return "Admin";
  return "Tim Medialab";
}

/**
 * Pemetaan aksi WorkflowLog (fase sample) -> tampilan timeline. Aksi fase
 * quotation/teknis/invoice sengaja dikembalikan null di sini karena sudah
 * diturunkan dari createdAt entitasnya (menghindari duplikasi).
 */
const LOG_EVENT_MAP: Record<
  string,
  { title: string; icon: string; tone: OrderTimelineEvent["tone"] } | null
> = {
  RECEIVE_SAMPLE: { title: "Sample diterima lab", icon: "PackageCheck", tone: "positive" },
  DISTRIBUTE_SAMPLE_PARAMETER: {
    title: "Parameter didistribusikan ke analis",
    icon: "Split",
    tone: "info",
  },
  START_ANALYSIS: { title: "Analisis dimulai", icon: "Microscope", tone: "info" },
  BULK_START_ANALYSIS: { title: "Analisis dimulai", icon: "Microscope", tone: "info" },
  ENTER_RESULT: { title: "Hasil analisis dimasukkan", icon: "FlaskConical", tone: "info" },
  BULK_ENTER_RESULT: { title: "Hasil analisis dimasukkan", icon: "FlaskConical", tone: "info" },
  REVIEW_RESULT: { title: "Hasil ditinjau (review)", icon: "Eye", tone: "info" },
  BULK_REVIEW_RESULT: { title: "Hasil ditinjau (review)", icon: "Eye", tone: "info" },
  VERIFY_RESULT: { title: "Hasil diverifikasi", icon: "ShieldCheck", tone: "info" },
  BULK_VERIFY_RESULT: { title: "Hasil diverifikasi", icon: "ShieldCheck", tone: "info" },
  VALIDATE_RESULT: { title: "Hasil divalidasi", icon: "BadgeCheck", tone: "positive" },
  BULK_VALIDATE_RESULT: { title: "Hasil divalidasi", icon: "BadgeCheck", tone: "positive" },
  ASK_RETEST: { title: "Permintaan uji ulang", icon: "RefreshCcw", tone: "warning" },
  BULK_ASK_RETEST: { title: "Permintaan uji ulang", icon: "RefreshCcw", tone: "warning" },
  CREATE_PRELIMINARY_COA: {
    title: "Preliminary COA diterbitkan",
    icon: "FileBadge",
    tone: "positive",
  },
  CUSTOMER_CONFIRM_PRELIMINARY_COA: {
    title: "Anda mengonfirmasi Preliminary COA",
    icon: "Check",
    tone: "positive",
  },
  CUSTOMER_REJECT_PRELIMINARY_COA: {
    title: "Anda meminta revisi Preliminary COA",
    icon: "RefreshCcw",
    tone: "warning",
  },
  CREATE_FINAL_COA: {
    title: "Sertifikat (Final COA) diterbitkan",
    icon: "Award",
    tone: "positive",
  },
  // Diturunkan dari entitas -> jangan tampilkan dari log (hindari duplikat).
  CREATE_SAMPLE_FROM_COC: null,
  CREATE_SAMPLE_FROM_QUOTATION: null,
  CREATE_COC: null,
  UPDATE_COC: null,
  CREATE_STPS: null,
  UPDATE_STPS: null,
  CREATE_LTR: null,
};

// ---- Types ----

export type OrderDocKind =
  | "quotation"
  | "ltr"
  | "sample-result"
  | "preliminary-coa"
  | "final-coa"
  | "invoice";

export type OrderDocument = {
  kind: OrderDocKind;
  label: string;
  description: string;
  pdfUrl: string;
  excelUrl: string;
};

export type OrderTimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail: string | null;
  actor: string | null;
  icon: string;
  tone: "neutral" | "positive" | "warning" | "info";
};

export type OrderParameterRow = {
  id: string;
  name: string;
  method: string | null;
  regulation: string | null;
  unit: string | null;
  status: string;
  statusLabel: string;
  resultValue: string | null;
};

export type OrderCostItem = {
  description: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type OrderCost = {
  items: OrderCostItem[];
  itemsSubtotal: number;
  samplingCost: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  invoice: {
    invoiceNo: string;
    status: string;
    statusLabel: string;
    amount: number;
    paymentProofUploadedAt: string | null;
    paidAt: string | null;
  } | null;
};

export type OrderDetail = {
  summary: OrderSummary;
  customerName: string;
  company: string | null;
  quotationDate: string;
  validUntil: string | null;
  samplingByLabel: string | null;
  objectiveLabel: string | null;
  tatLabel: string | null;
  estimatedCoaDate: string | null;
  plannedSamplingStart: string | null;
  plannedSamplingEnd: string | null;
  sampleNo: string | null;
  note: string | null;
  documents: OrderDocument[];
  timeline: OrderTimelineEvent[];
  parameters: OrderParameterRow[];
  cost: OrderCost;
};

// ---- Fetcher ----

export async function getCustomerOrderDetail(
  customerId: string,
  quotationId: string
): Promise<OrderDetail | null> {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: { select: { name: true, company: true } },
      coaTemplate: { select: { name: true } },
      items: { include: { parameter: true } },
      purchaseOrder: true,
      ltr: true,
      coc: true,
      stps: true,
      invoice: true,
      samples: {
        include: {
          parameters: { include: { parameter: true } },
          coa: true,
        },
      },
    },
  });

  // Ownership guard — customer hanya boleh melihat pesanannya sendiri.
  if (!quotation || quotation.customerId !== customerId) {
    return null;
  }

  const sample = quotation.samples[0] ?? null;
  const sampleIds = quotation.samples.map((s) => s.id);

  // Ringkasan tahap — pakai fungsi yang sama dengan kartu dashboard agar
  // konsisten (satu sumber kebenaran untuk "tahap keberapa").
  const summary = computeMilestone({
    id: quotation.id,
    quotationNo: quotation.quotationNo,
    status: quotation.status,
    tatRequested: quotation.tatRequested,
    updatedAt: quotation.updatedAt,
    coaTemplate: quotation.coaTemplate,
    coc: quotation.coc ? { estimatedCoaDate: quotation.coc.estimatedCoaDate } : null,
    samples: quotation.samples.map((s) => ({
      id: s.id,
      status: s.status,
      parameters: s.parameters.map((p) => ({
        status: p.status,
        retestReason: p.retestReason,
      })),
    })),
    invoice: quotation.invoice
      ? { id: quotation.invoice.id, status: quotation.invoice.status }
      : null,
  });

  // ---- Dokumen (hanya yang boleh diakses customer + memang ada) ----
  const documents: OrderDocument[] = [];
  documents.push({
    kind: "quotation",
    label: "Quotation",
    description: "Penawaran harga & rincian parameter",
    pdfUrl: `/api/exports/quotation/${quotation.id}/pdf`,
    excelUrl: `/api/exports/quotation/${quotation.id}/excel`,
  });
  if (quotation.ltr) {
    documents.push({
      kind: "ltr",
      label: "LTR",
      description: "Letter of Test Request",
      pdfUrl: `/api/exports/ltr/${quotation.ltr.id}/pdf`,
      excelUrl: `/api/exports/ltr/${quotation.ltr.id}/excel`,
    });
  }
  const preliminaryCoa = sample?.coa.find((c) => c.type === "PRELIMINARY");
  const finalCoa = sample?.coa.find((c) => c.type === "FINAL");
  if (sample && (sample.status === "PRELIMINARY_COA" || preliminaryCoa || finalCoa)) {
    documents.push({
      kind: "sample-result",
      label: "Ringkasan Hasil",
      description: "Lab Result Summary",
      pdfUrl: `/api/exports/sample/${sample.id}/result-pdf`,
      excelUrl: `/api/exports/sample/${sample.id}/result-excel`,
    });
  }
  if (preliminaryCoa) {
    documents.push({
      kind: "preliminary-coa",
      label: "Preliminary COA",
      description: "Sertifikat awal untuk ditinjau",
      pdfUrl: `/api/exports/coa/${preliminaryCoa.id}/pdf`,
      excelUrl: `/api/exports/coa/${preliminaryCoa.id}/excel`,
    });
  }
  if (finalCoa) {
    documents.push({
      kind: "final-coa",
      label: "Final COA",
      description: "Sertifikat resmi hasil analisis",
      pdfUrl: `/api/exports/coa/${finalCoa.id}/pdf`,
      excelUrl: `/api/exports/coa/${finalCoa.id}/excel`,
    });
  }
  if (quotation.invoice) {
    documents.push({
      kind: "invoice",
      label: "Invoice",
      description: "Tagihan pembayaran",
      pdfUrl: `/api/exports/invoice/${quotation.invoice.id}/pdf`,
      excelUrl: `/api/exports/invoice/${quotation.invoice.id}/excel`,
    });
  }

  // ---- Timeline kronologis bertimestamp ----
  const events: OrderTimelineEvent[] = [];

  events.push({
    id: `quotation-${quotation.id}`,
    at: quotation.createdAt.toISOString(),
    title: "Pesanan diajukan",
    detail: `Quotation ${quotation.quotationNo} dibuat`,
    actor: "Anda",
    icon: "FilePlus",
    tone: "neutral",
  });

  if (quotation.purchaseOrder) {
    events.push({
      id: `po-${quotation.purchaseOrder.id}`,
      at: quotation.purchaseOrder.createdAt.toISOString(),
      title: "Purchase Order diunggah",
      detail: `PO ${quotation.purchaseOrder.poNumber}`,
      actor: "Anda",
      icon: "FileCheck",
      tone: "positive",
    });
  }

  if (quotation.ltr) {
    events.push({
      id: `ltr-${quotation.ltr.id}`,
      at: quotation.ltr.createdAt.toISOString(),
      title: "LTR terbit",
      detail: `Letter of Test Request ${quotation.ltr.ltrNo}`,
      actor: "Tim Sales",
      icon: "FileSignature",
      tone: "info",
    });
  }

  if (quotation.coc) {
    events.push({
      id: `coc-${quotation.coc.id}`,
      at: quotation.coc.createdAt.toISOString(),
      title: "Jadwal & rencana sampling disiapkan",
      detail: `COC ${quotation.coc.cocNo}`,
      actor: "Tim Teknis",
      icon: "ClipboardCheck",
      tone: "info",
    });
  }

  for (const st of quotation.stps) {
    events.push({
      id: `stps-${st.id}`,
      at: st.createdAt.toISOString(),
      title: "Surat tugas sampling (STPS) terbit",
      detail: `STPS ${st.stpsNo}`,
      actor: "Tim Teknis",
      icon: "FileSignature",
      tone: "info",
    });
  }

  if (sample?.sentByCustomerAt) {
    events.push({
      id: `sample-sent-${sample.id}`,
      at: sample.sentByCustomerAt.toISOString(),
      title: "Sample dikirim",
      detail: `Sample ${sample.sampleNo}`,
      actor: "Anda",
      icon: "Package",
      tone: "neutral",
    });
  }

  // WorkflowLog fase-sample (punya sampleId asli) + nama tim pelaku.
  if (sampleIds.length > 0) {
    const logs = await prisma.workflowLog.findMany({
      where: { sampleId: { in: sampleIds } },
      orderBy: { createdAt: "asc" },
    });

    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))] as string[];
    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, role: { select: { code: true } } },
        })
      : [];
    const actorRoleById = new Map(actors.map((a) => [a.id, a.role?.code ?? null]));

    for (const log of logs) {
      const mapped = LOG_EVENT_MAP[log.action];
      if (!mapped) continue; // aksi internal / diturunkan dari entitas
      events.push({
        id: `log-${log.id}`,
        at: log.createdAt.toISOString(),
        title: mapped.title,
        detail: log.note,
        actor: actorTeamLabel(actorRoleById.get(log.actorId ?? "")),
        icon: mapped.icon,
        tone: mapped.tone,
      });
    }
  }

  if (quotation.invoice) {
    events.push({
      id: `invoice-${quotation.invoice.id}`,
      at: quotation.invoice.createdAt.toISOString(),
      title: "Invoice diterbitkan",
      detail: `Invoice ${quotation.invoice.invoiceNo}`,
      actor: "Tim Finance",
      icon: "Receipt",
      tone: "info",
    });
    if (quotation.invoice.paymentProofUploadedAt) {
      events.push({
        id: `invoice-proof-${quotation.invoice.id}`,
        at: quotation.invoice.paymentProofUploadedAt.toISOString(),
        title: "Bukti pembayaran diunggah",
        detail: null,
        actor: "Anda",
        icon: "Upload",
        tone: "neutral",
      });
    }
    if (quotation.invoice.paidAt) {
      events.push({
        id: `invoice-paid-${quotation.invoice.id}`,
        at: quotation.invoice.paidAt.toISOString(),
        title: "Pembayaran lunas",
        detail: `Invoice ${quotation.invoice.invoiceNo} dikonfirmasi lunas`,
        actor: "Tim Finance",
        icon: "CheckCheck",
        tone: "positive",
      });
    }
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // ---- Parameter & hasil ----
  // Prioritas: SampleParameter (punya status & nilai hasil). Kalau belum ada
  // sample, fallback ke QuotationItem (baru pesan, belum dianalisis).
  let parameters: OrderParameterRow[];
  if (sample && sample.parameters.length > 0) {
    parameters = sample.parameters.map((p) => ({
      id: p.id,
      name: p.parameter.name,
      method: p.parameter.method,
      regulation: null,
      unit: p.parameter.unit,
      status: p.status,
      statusLabel: RESULT_STATUS_LABEL[p.status] ?? p.status,
      resultValue:
        p.status === "VALIDATED" || p.status === "VERIFIED" || p.status === "REVIEWED"
          ? p.resultValue
          : null,
    }));
  } else {
    parameters = quotation.items.map((it) => ({
      id: it.id,
      name: it.parameter.name,
      method: it.method || it.parameter.method,
      regulation: it.regulationMatrix,
      unit: it.parameter.unit,
      status: "WAITING",
      statusLabel: "Belum Dianalisis",
      resultValue: null,
    }));
  }

  // ---- Biaya ----
  const costItems: OrderCostItem[] = quotation.items.map((it) => ({
    description: it.description || it.parameter.name,
    qty: it.qty,
    price: it.price,
    subtotal: it.qty * it.price,
  }));
  const itemsSubtotal = costItems.reduce((sum, it) => sum + it.subtotal, 0);

  const cost: OrderCost = {
    items: costItems,
    itemsSubtotal,
    samplingCost: quotation.samplingCost,
    vatPercent: quotation.vatPercent,
    vatAmount: quotation.vatAmount,
    grandTotal:
      quotation.grandTotal ||
      itemsSubtotal + quotation.samplingCost + quotation.vatAmount,
    invoice: quotation.invoice
      ? {
          invoiceNo: quotation.invoice.invoiceNo,
          status: quotation.invoice.status,
          statusLabel:
            INVOICE_STATUS_LABEL[quotation.invoice.status] ??
            quotation.invoice.status,
          amount: quotation.invoice.amount,
          paymentProofUploadedAt:
            quotation.invoice.paymentProofUploadedAt?.toISOString() ?? null,
          paidAt: quotation.invoice.paidAt?.toISOString() ?? null,
        }
      : null,
  };

  return {
    summary,
    customerName: quotation.customer.name,
    company: quotation.customer.company,
    quotationDate: quotation.quotationDate.toISOString(),
    validUntil: quotation.validUntil?.toISOString() ?? null,
    samplingByLabel: quotation.samplingBy
      ? SAMPLING_BY_LABEL[quotation.samplingBy] ?? quotation.samplingBy
      : null,
    objectiveLabel: quotation.testingObjective
      ? OBJECTIVE_LABEL[quotation.testingObjective] ?? quotation.testingObjective
      : null,
    tatLabel: quotation.tatRequested
      ? TAT_LABEL[quotation.tatRequested] ?? quotation.tatRequested
      : null,
    estimatedCoaDate: quotation.coc?.estimatedCoaDate?.toISOString() ?? null,
    plannedSamplingStart: quotation.coc?.plannedSamplingStart?.toISOString() ?? null,
    plannedSamplingEnd: quotation.coc?.plannedSamplingEnd?.toISOString() ?? null,
    sampleNo: sample?.sampleNo ?? null,
    note: quotation.note,
    documents,
    timeline: events,
    parameters,
    cost,
  };
}
