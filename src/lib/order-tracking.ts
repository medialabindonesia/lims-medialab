import { prisma } from "@/lib/db";

/**
 * Order Tracker — menurunkan status "pesanan" yang mudah dipahami customer
 * dari status granular lintas 4 model (Quotation, Sample, SampleParameter,
 * Coa, Invoice). Satu Quotation = satu "order" yang dilacak.
 *
 * PENTING: jangan pakai urutan deklarasi enum Prisma sebagai acuan tahapan —
 * urutan deklarasi QuotationStatus TIDAK sama dengan urutan kronologis asli
 * (VERIFIED dideklarasikan sebelum CONFIRMED, padahal CONFIRMED terjadi
 * duluan). Rank di bawah ini di-ground-truth dari logic precondition di
 * masing-masing API route (lihat src/app/api/quotations/[id]/*).
 */

export type OrderStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const STAGE_META: Record<
  OrderStage,
  { label: string; icon: string }
> = {
  0: { label: "Menunggu Persetujuan", icon: "FilePlus" },
  1: { label: "Quotation Disetujui", icon: "FileCheck" },
  2: { label: "Sample Diterima Lab", icon: "PackageCheck" },
  3: { label: "Sedang Dianalisis", icon: "Microscope" },
  4: { label: "Menunggu Konfirmasi Anda", icon: "FileBadge" },
  5: { label: "Sertifikat Terbit", icon: "Award" },
  6: { label: "Selesai", icon: "CheckCheck" },
};

const QUOTATION_RANK: Record<string, number> = {
  REQUESTED: 0,
  REVISION: 0,
  NEGOTIATION: 0,
  CONFIRMED: 1,
  VERIFIED: 1,
  APPROVED: 1,
  PO_UPLOADED: 1,
  LTR_CREATED: 1,
  COC_CREATED: 1,
};

type SampleParameterLite = {
  status: string;
  retestReason: string | null;
};

type SampleLite = {
  status: string;
  parameters: SampleParameterLite[];
};

type InvoiceLite = {
  status: string;
} | null;

export type OrderSummary = {
  id: string;
  quotationNo: string;
  templateName: string | null;
  tatRequested: string | null;
  estimatedCoaDate: string | null;
  updatedAt: string;
  stage: OrderStage;
  stageLabel: string;
  stageIcon: string;
  stageDescription: string;
  subProgress: { done: number; total: number } | null;
  retestBanner: string | null;
  invoiceStatus: string | null;
  invoiceId: string | null;
  sampleId: string | null;
};

export type OrderInput = {
  id: string;
  quotationNo: string;
  status: string;
  tatRequested: string | null;
  updatedAt: Date;
  coaTemplate: { name: string } | null;
  coc: { estimatedCoaDate: Date | null } | null;
  samples: (SampleLite & { id: string })[];
  invoice: (InvoiceLite & { id: string }) | null;
};

function computeSampleStage(
  sample: SampleLite
): { stage: OrderStage; description: string } {
  switch (sample.status) {
    case "WAITING_SAMPLE":
    case "SAMPLE_SENT":
      return { stage: 2, description: "Sample dalam pengiriman ke lab" };
    case "RECEIVED":
      return { stage: 2, description: "Sample sudah diterima lab" };
    case "DISTRIBUTED":
    case "IN_ANALYSIS":
    case "REVIEWED":
    case "VERIFIED":
    case "VALIDATED":
    case "RETEST":
      return { stage: 3, description: "Parameter sedang dianalisis tim lab" };
    case "PRELIMINARY_COA":
      return {
        stage: 4,
        description: "Preliminary COA terbit, menunggu konfirmasi Anda",
      };
    case "FINAL_COA":
    case "COMPLETED":
      return { stage: 5, description: "Sertifikat (Final COA) sudah terbit" };
    default:
      return { stage: 2, description: "Sample sedang diproses" };
  }
}

/** Fungsi murni — bisa diuji tanpa DB. */
export function computeMilestone(order: OrderInput): OrderSummary {
  const sample = order.samples[0] ?? null;

  let stage: OrderStage;
  let description: string;
  let subProgress: OrderSummary["subProgress"] = null;
  let retestBanner: string | null = null;

  if (!sample) {
    const rank = QUOTATION_RANK[order.status] ?? 0;
    stage = rank === 0 ? 0 : 1;
    description =
      stage === 0
        ? "Quotation Anda sedang diproses tim sales"
        : "Quotation disetujui, menunggu pengiriman sample";
  } else {
    const result = computeSampleStage(sample);
    stage = result.stage;
    description = result.description;

    if (stage === 3 && sample.parameters.length > 0) {
      subProgress = {
        done: sample.parameters.filter((p) => p.status === "VALIDATED")
          .length,
        total: sample.parameters.length,
      };
    }

    const retestParam = sample.parameters.find(
      (p) => p.status === "RETEST" && p.retestReason
    );
    if (sample.status === "RETEST" || retestParam) {
      retestBanner =
        retestParam?.retestReason ||
        "Hasil sedang ditinjau ulang oleh tim lab";
    }
  }

  // Lane invoice: begitu Final COA terbit, "Selesai" (stage 6) baru
  // tercapai kalau invoice benar-benar PAID. Sebelum itu tetap di stage 5
  // dengan sub-status invoice sebagai info tambahan.
  if (stage === 5 && order.invoice?.status === "PAID") {
    stage = 6;
    description = "Pesanan selesai — invoice sudah dibayar";
  }

  const meta = STAGE_META[stage];

  return {
    id: order.id,
    quotationNo: order.quotationNo,
    templateName: order.coaTemplate?.name ?? null,
    tatRequested: order.tatRequested,
    estimatedCoaDate: order.coc?.estimatedCoaDate?.toISOString() ?? null,
    updatedAt: order.updatedAt.toISOString(),
    stage,
    stageLabel: meta.label,
    stageIcon: meta.icon,
    stageDescription: description,
    subProgress,
    retestBanner,
    invoiceStatus: order.invoice?.status ?? null,
    invoiceId: order.invoice?.id ?? null,
    sampleId: sample?.id ?? null,
  };
}

export async function getCustomerOrders(
  customerId: string
): Promise<OrderSummary[]> {
  const quotations = await prisma.quotation.findMany({
    where: { customerId },
    include: {
      coaTemplate: { select: { name: true } },
      coc: { select: { estimatedCoaDate: true } },
      samples: {
        select: {
          id: true,
          status: true,
          parameters: { select: { status: true, retestReason: true } },
        },
      },
      invoice: { select: { id: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return quotations.map((q) => computeMilestone(q));
}
