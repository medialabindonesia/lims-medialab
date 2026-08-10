import type { TatRequest } from "@prisma/client";

export type TatPolicy = {
  code: TatRequest;
  label: string;
  businessDays: number;
  priceMultiplier: number;
};

export const TAT_POLICIES: Record<TatRequest, TatPolicy> = {
  NORMAL: {
    code: "NORMAL",
    label: "Normal",
    businessDays: 10,
    priceMultiplier: 1,
  },
  URGENT: {
    code: "URGENT",
    label: "Urgent",
    businessDays: 7,
    priceMultiplier: 1.3,
  },
  TOP_URGENT: {
    code: "TOP_URGENT",
    label: "Top Urgent",
    businessDays: 5,
    priceMultiplier: 1.5,
  },
};

export function resolveTatPolicy(value?: TatRequest | null) {
  return TAT_POLICIES[value ?? "NORMAL"];
}

/** TAT hanya menaikkan jasa pengujian; sampling cost tidak ikut dikalikan. */
export function calculateTatCharge(
  testingSubtotal: number,
  value?: TatRequest | null
) {
  const policy = resolveTatPolicy(value);
  const adjustedTestingAmount = testingSubtotal * policy.priceMultiplier;

  return {
    policy,
    adjustedTestingAmount,
    surchargeAmount: adjustedTestingAmount - testingSubtotal,
  };
}

/** Menghitung hari kerja Senin-Jumat. Hari libur khusus perusahaan dapat
 * dipasok kemudian dari kalender operasional. */
export function addBusinessDays(
  start: Date,
  businessDays: number,
  holidays: Date[] = []
) {
  const result = new Date(start);
  const holidayKeys = new Set(
    holidays.map((date) => date.toISOString().slice(0, 10))
  );
  let remaining = Math.max(0, businessDays);

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    const key = result.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidayKeys.has(key)) remaining -= 1;
  }

  return result;
}

