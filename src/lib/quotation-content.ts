import { z } from "zod";
import type { Prisma, QuotationPricingStatus, TatRequest } from "@prisma/client";
import { computePricingStatus } from "@/lib/order-code";
import { calculateTatCharge } from "@/lib/tat-policy";

/**
 * Penyusunan isi quotation berbasis GRUP.
 *
 * Satu grup setara satu baris pada surat penawaran resmi: satu paket pekerjaan
 * dengan satu matriks, satu regulasi, sejumlah titik sampling, dan sekumpulan
 * parameter uji. `qty` grup adalah JUMLAH TITIK SAMPLING (mis. Upwind +
 * Downwind = 2), bukan jumlah pengulangan parameter.
 *
 * Modul ini dipakai bersama oleh POST /api/quotations dan PATCH
 * /api/quotations/[id] agar aturan validasi tidak bercabang dua.
 *
 * KOMPATIBILITAS
 * --------------
 * Selain menulis relasi baru (group, regulationParameter, duration), setiap
 * QuotationItem tetap diisi kolom teks lama (`regulationMatrix`,
 * `durationSampling`, `samplingLocation`, `customerSampleId`, `method`) sebagai
 * snapshot. Dengan begitu LTR, CoC, STPS, dan generator PDF yang sudah ada
 * tetap berjalan tanpa perubahan.
 */

type DbClient = Prisma.TransactionClient;

const nullableString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().optional().nullable()
);

const groupItemSchema = z.object({
  /** Asal parameter di master regulasi. Kosong untuk item bebas. */
  regulationParameterId: nullableString,
  parameterId: z.string().min(1, "Parameter wajib dipilih"),
  durationId: nullableString,
  /**
   * null berarti harga BELUM DITETAPKAN (berbeda dari 0).
   * Bila field tidak dikirim sama sekali, harga dasar master yang dipakai.
   *
   * `.nullable()` WAJIB berada di luar `coerce`. Ditulis sebagai
   * `z.union([z.coerce.number(), z.null()])`, cabang coerce dicoba lebih dulu
   * dan `Number(null)` bernilai 0 — sehingga harga yang sengaja dikosongkan
   * diam-diam tersimpan sebagai nol dan quotation dianggap sudah berharga.
   */
  price: z.coerce.number().min(0).nullable().optional(),
  /** Bila kosong, mengikuti qty grup (jumlah titik sampling). */
  qty: z.coerce.number().int().min(1).optional(),
  method: nullableString,
});

const groupLocationSchema = z.object({
  label: z.string().trim().min(1, "Nama titik sampling wajib diisi"),
  customerSampleId: nullableString,
});

export const quotationGroupSchema = z.object({
  description: nullableString,
  matrixId: nullableString,
  /** Primary legacy regulation. `regulationIds` adalah sumber multi-select. */
  regulationId: nullableString,
  regulationIds: z.array(z.string().min(1)).default([]),
  qty: z.coerce.number().int().min(1, "Qty minimal 1").default(1),
  /** Harga paket/grup. Null berarti belum ditetapkan. */
  unitPrice: z.coerce.number().min(0).nullable().optional(),
  note: nullableString,
  locations: z.array(groupLocationSchema).default([]),
  items: z
    .array(groupItemSchema)
    .min(1, "Setiap grup minimal berisi 1 parameter"),
});

export const quotationChargeItemSchema = z.object({
  category: z.enum(["SAMPLING", "DOCUMENT", "OTHER"]),
  description: z.string().trim().min(1, "Deskripsi biaya wajib diisi").max(191),
  detail: nullableString,
  qty: z.coerce.number().positive("Qty biaya harus lebih dari 0").default(1),
  unit: nullableString,
  unitPrice: z.coerce.number().min(0).nullable(),
});

export type QuotationGroupInput = z.infer<typeof quotationGroupSchema>;
export type QuotationChargeItemInput = z.infer<typeof quotationChargeItemSchema>;

export type ResolvedItem = {
  parameterId: string;
  regulationParameterId: string | null;
  durationId: string | null;
  qty: number;
  sort: number;
  price: number | null;
  basePrice: number | null;
  method: string | null;
  regulationMatrix: string | null;
  durationSampling: string | null;
  samplingLocation: string | null;
  customerSampleId: string | null;
  description: string | null;
};

export type ResolvedGroup = {
  sort: number;
  description: string | null;
  matrixId: string | null;
  regulationId: string | null;
  regulationIds: string[];
  qty: number;
  unitPrice: number | null;
  basePrice: number | null;
  pricingMode: "ITEM" | "PACKAGE";
  note: string | null;
  locations: Array<{
    label: string;
    customerSampleId: string | null;
    sort: number;
  }>;
  items: ResolvedItem[];
};

export type ResolvedChargeItem = QuotationChargeItemInput & { sort: number };

export type ResolvedQuotationContent = {
  groups: ResolvedGroup[];
  chargeItems: ResolvedChargeItem[];
  totalAmount: number;
  samplingCost: number;
  additionalCost: number;
  pricingStatus: QuotationPricingStatus;
  unpricedCount: number;
};

type ResolveResult =
  | { ok: true; content: ResolvedQuotationContent }
  | { ok: false; message: string };

/**
 * AnalysisParameter.price tidak nullable karena kolom itu milik bersama dengan
 * modul COA dan tidak boleh diubah dari sisi marketing. Nilai 0 di sana pada
 * praktiknya berarti "belum ditetapkan", bukan gratis, sehingga dipetakan ke
 * null saat dipakai sebagai harga dasar.
 */
function legacyBasePrice(price: number | undefined) {
  return price && price > 0 ? price : null;
}

export type ResolveOptions = {
  /**
   * Abaikan harga yang dikirim klien dan pakai harga dasar master.
   *
   * Dinyalakan untuk pengajuan dari portal customer. Tanpa ini customer bisa
   * mengirim harga karangannya sendiri lewat payload; harga itu tersimpan apa
   * adanya, quotation dianggap PRICED, dan gerbang harga di approval ikut
   * lolos — sehingga satu-satunya penahan tinggal kejelian manusia.
   *
   * Customer menentukan APA yang diuji; Medialab yang menentukan harganya.
   */
  ignoreSubmittedPrices?: boolean;
  chargeItems?: QuotationChargeItemInput[];
};

export async function resolveQuotationContent(
  db: DbClient,
  groups: QuotationGroupInput[],
  options: ResolveOptions = {}
): Promise<ResolveResult> {
  if (groups.length === 0) {
    return { ok: false, message: "Minimal buat 1 grup parameter" };
  }

  const regulationIds = [
    ...new Set(
      groups.flatMap((group) => [
        ...group.regulationIds,
        ...(group.regulationId ? [group.regulationId] : []),
      ])
    ),
  ] as string[];

  const regulationParameterIds = [
    ...new Set(
      groups.flatMap((group) =>
        group.items.map((item) => item.regulationParameterId).filter(Boolean)
      )
    ),
  ] as string[];

  const parameterIds = [
    ...new Set(groups.flatMap((group) => group.items.map((i) => i.parameterId))),
  ];

  const matrixIds = [
    ...new Set(groups.map((group) => group.matrixId).filter(Boolean)),
  ] as string[];

  const [regulations, regulationParameters, parameters, matrices] =
    await Promise.all([
      regulationIds.length
        ? db.regulation.findMany({
            where: { id: { in: regulationIds }, isActive: true },
            select: {
              id: true,
              matrixId: true,
              name: true,
              shortName: true,
              matrix: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      regulationParameterIds.length
        ? db.regulationParameter.findMany({
            where: { id: { in: regulationParameterIds }, isActive: true },
            select: {
              id: true,
              regulationId: true,
              parameterId: true,
              displayName: true,
              method: true,
              basePrice: true,
              durations: {
                select: {
                  durationId: true,
                  duration: { select: { id: true, label: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      db.analysisParameter.findMany({
        where: { id: { in: parameterIds }, isActive: true },
        select: { id: true, name: true, method: true, price: true },
      }),
      matrixIds.length
        ? db.matrix.findMany({
            where: { id: { in: matrixIds }, isActive: true },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

  const regulationById = new Map(regulations.map((row) => [row.id, row]));
  const regulationParameterById = new Map(
    regulationParameters.map((row) => [row.id, row])
  );
  const parameterById = new Map(parameters.map((row) => [row.id, row]));
  const matrixById = new Map(matrices.map((row) => [row.id, row]));

  if (regulationIds.some((id) => !regulationById.has(id))) {
    return { ok: false, message: "Ada regulasi yang tidak ditemukan / nonaktif" };
  }

  if (regulationParameterIds.some((id) => !regulationParameterById.has(id))) {
    return {
      ok: false,
      message: "Ada parameter regulasi yang tidak ditemukan / nonaktif",
    };
  }

  if (parameterIds.some((id) => !parameterById.has(id))) {
    return {
      ok: false,
      message: "Ada parameter yang tidak ditemukan / nonaktif",
    };
  }

  if (matrixIds.some((id) => !matrixById.has(id))) {
    return { ok: false, message: "Ada matriks yang tidak ditemukan / nonaktif" };
  }

  const resolvedGroups: ResolvedGroup[] = [];
  const allPrices: Array<number | null> = [];
  let totalAmount = 0;

  for (const [groupIndex, group] of groups.entries()) {
    const selectedRegulationIds = [
      ...new Set([
        ...group.regulationIds,
        ...(group.regulationId ? [group.regulationId] : []),
      ]),
    ];
    const primaryRegulationId = selectedRegulationIds[0] ?? null;
    const regulation = primaryRegulationId
      ? regulationById.get(primaryRegulationId)
      : null;

    if (selectedRegulationIds.length === 0) {
      return {
        ok: false,
        message: `Grup ${groupIndex + 1}: minimal pilih satu regulasi`,
      };
    }

    const groupRegulations = selectedRegulationIds
      .map((id) => regulationById.get(id))
      .filter(Boolean);
    const regulationMatrixIds = new Set(
      groupRegulations.map((entry) => entry!.matrixId)
    );
    if (regulationMatrixIds.size > 1) {
      return {
        ok: false,
        message: `Grup ${groupIndex + 1}: semua regulasi harus berasal dari matriks yang sama`,
      };
    }

    // Matriks diambil dari regulasi bila ada, agar tidak mungkin tidak sinkron
    // dengan regulasi yang dipilih.
    const matrixId = regulation?.matrixId ?? group.matrixId ?? null;
    const matrixName = regulation?.matrix?.name ?? (group.matrixId ? matrixById.get(group.matrixId)?.name : null);

    const locations = group.locations.map((location, index) => ({
      label: location.label,
      customerSampleId: location.customerSampleId ?? null,
      sort: (index + 1) * 10,
    }));

    // Snapshot teks agar dokumen turunan (LTR/CoC/PDF) tetap terbaca.
    const samplingLocation =
      locations.map((location) => location.label).join(", ") || null;
    const customerSampleId =
      locations
        .map((location) => location.customerSampleId)
        .filter(Boolean)
        .join(", ") || null;
    const items: ResolvedItem[] = [];
    const packagePricing = group.unitPrice !== undefined;
    const packageUnitPrice = options.ignoreSubmittedPrices
      ? null
      : group.unitPrice ?? null;

    if (packagePricing) {
      allPrices.push(packageUnitPrice);
      totalAmount += (packageUnitPrice ?? 0) * group.qty;
    }

    for (const [itemIndex, item] of group.items.entries()) {
      const regulationParameter = item.regulationParameterId
        ? regulationParameterById.get(item.regulationParameterId)
        : null;

      if (regulationParameter) {
        if (
          !selectedRegulationIds.includes(regulationParameter.regulationId)
        ) {
          return {
            ok: false,
            message: `Grup ${groupIndex + 1}: ada parameter yang bukan milik regulasi yang dipilih`,
          };
        }

        if (regulationParameter.parameterId !== item.parameterId) {
          return {
            ok: false,
            message: `Grup ${groupIndex + 1}: parameter tidak cocok dengan data master regulasi`,
          };
        }
      }

      // Durasi hanya boleh dipilih dari daftar yang sah untuk parameter itu di
      // regulasi tersebut. Parameter yang belum punya daftar durasi
      // dibiarkan menerima durasi apa pun agar master yang belum lengkap tidak
      // memblokir sales.
      let durationId = item.durationId ?? null;
      let durationLabel: string | null = null;

      if (regulationParameter && regulationParameter.durations.length > 0) {
        const allowed = regulationParameter.durations.find(
          (entry) => entry.durationId === durationId
        );

        if (durationId && !allowed) {
          return {
            ok: false,
            message: `Grup ${groupIndex + 1}: durasi tidak berlaku untuk parameter yang dipilih`,
          };
        }

        durationLabel = allowed?.duration.label ?? null;
      } else if (durationId) {
        // Tidak ada daftar pembanding; simpan id apa adanya tanpa label.
        durationLabel = null;
      }

      if (!durationId) durationId = null;

      const parameter = parameterById.get(item.parameterId);
      const basePrice =
        regulationParameter?.basePrice ?? legacyBasePrice(parameter?.price);

      // price tidak dikirim  -> pakai harga dasar (boleh null)
      // price dikirim null   -> sengaja dikosongkan
      // pengajuan customer   -> harga kiriman diabaikan sepenuhnya
      const price = options.ignoreSubmittedPrices
        ? basePrice
        : item.price === undefined
          ? basePrice
          : item.price;

      const qty = item.qty ?? group.qty;
      const itemRegulation = regulationParameter
        ? regulationById.get(regulationParameter.regulationId)
        : regulation;
      const regulationMatrix = itemRegulation
        ? itemRegulation.shortName || itemRegulation.name
        : null;

      // Data lama masih boleh memakai harga per parameter. Payload baru selalu
      // mengirim field unitPrice sehingga harga komersial hanya dihitung sekali
      // pada level paket, bukan sebanyak jumlah parameter.
      if (!packagePricing) {
        allPrices.push(price ?? null);
        totalAmount += (price ?? 0) * qty;
      }

      items.push({
        parameterId: item.parameterId,
        regulationParameterId: regulationParameter?.id ?? null,
        durationId,
        qty,
        sort: (itemIndex + 1) * 10,
        price: price ?? null,
        basePrice,
        method:
          item.method ??
          regulationParameter?.method ??
          parameter?.method ??
          null,
        regulationMatrix,
        durationSampling: durationLabel,
        samplingLocation,
        customerSampleId,
        description: null,
      });
    }

    resolvedGroups.push({
      sort: (groupIndex + 1) * 10,
      description: group.description ?? matrixName ?? null,
      matrixId,
      regulationId: primaryRegulationId,
      regulationIds: selectedRegulationIds,
      qty: group.qty,
      unitPrice: packageUnitPrice,
      basePrice: null,
      pricingMode: packagePricing ? "PACKAGE" : "ITEM",
      note: group.note ?? null,
      locations,
      items,
    });
  }

  const chargeItems: ResolvedChargeItem[] = options.ignoreSubmittedPrices
    ? []
    : (options.chargeItems ?? []).map((item, index) => ({
        ...item,
        detail: item.detail ?? null,
        unit: item.unit ?? null,
        sort: (index + 1) * 10,
      }));
  for (const item of chargeItems) allPrices.push(item.unitPrice);

  const samplingCost = chargeItems
    .filter((item) => item.category === "SAMPLING")
    .reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.qty, 0);
  const additionalCost = chargeItems
    .filter((item) => item.category !== "SAMPLING")
    .reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.qty, 0);

  return {
    ok: true,
    content: {
      groups: resolvedGroups,
      chargeItems,
      totalAmount,
      samplingCost,
      additionalCost,
      pricingStatus: computePricingStatus(allPrices),
      unpricedCount: allPrices.filter((price) => price === null).length,
    },
  };
}

/**
 * Menulis grup, titik sampling, dan item ke database.
 *
 * QuotationItem.quotationId wajib diisi sementara QuotationGroup tidak
 * mengetahuinya, sehingga item dibuat pada langkah kedua setelah id grup
 * diketahui — bukan sebagai nested create di bawah grup.
 */
export async function persistQuotationContent(
  db: DbClient,
  quotationId: string,
  content: ResolvedQuotationContent
) {
  for (const group of content.groups) {
    const created = await db.quotationGroup.create({
      data: {
        quotationId,
        sort: group.sort,
        description: group.description,
        matrixId: group.matrixId,
        regulationId: group.regulationId,
        qty: group.qty,
        note: group.note,
        unitPrice: group.unitPrice,
        basePrice: group.basePrice,
        pricingMode: group.pricingMode,
        locations: group.locations.length
          ? { create: group.locations }
          : undefined,
        regulationLinks: group.regulationIds.length
          ? {
              create: group.regulationIds.map((regulationId, index) => ({
                regulationId,
                sort: (index + 1) * 10,
              })),
            }
          : undefined,
      },
      select: { id: true },
    });

    if (group.items.length === 0) continue;

    await db.quotationItem.createMany({
      data: group.items.map((item) => ({
        ...item,
        quotationId,
        groupId: created.id,
      })),
    });
  }

  if (content.chargeItems.length > 0) {
    await db.quotationChargeItem.createMany({
      data: content.chargeItems.map((item) => ({
        quotationId,
        category: item.category,
        description: item.description,
        detail: item.detail,
        qty: item.qty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        sort: item.sort,
      })),
    });
  }
}

export function calculateQuotationTotals(input: {
  totalAmount: number;
  samplingCost?: number;
  additionalCost?: number;
  discountAmount?: number;
  vatPercent?: number;
  tatRequested?: TatRequest | null;
}) {
  const samplingCost = input.samplingCost || 0;
  const additionalCost = input.additionalCost || 0;
  const discountAmount = Math.max(0, input.discountAmount || 0);
  const vatPercent = input.vatPercent ?? 11;
  const tat = calculateTatCharge(input.totalAmount, input.tatRequested);
  const subtotal = tat.adjustedTestingAmount + samplingCost + additionalCost;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const vatAmount = taxableAmount * (vatPercent / 100);

  return {
    totalAmount: input.totalAmount,
    tatBusinessDays: tat.policy.businessDays,
    tatPriceMultiplier: tat.policy.priceMultiplier,
    tatSurchargeAmount: tat.surchargeAmount,
    samplingCost,
    additionalCost,
    discountAmount,
    vatPercent,
    vatAmount,
    grandTotal: taxableAmount + vatAmount,
  };
}
