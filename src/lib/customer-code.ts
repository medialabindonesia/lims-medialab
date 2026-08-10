import type { CustomerType } from "@prisma/client";

const DEFAULT_CENTER_CODE = "001";
const CUSTOMER_SEQUENCE_PADDING = 5;

type CustomerCodeFinder = {
  customer: {
    findFirst: (args: {
      where: { customerCode: { startsWith: string } };
      orderBy: { customerCode: "desc" };
      select: { customerCode: true };
    }) => Promise<{ customerCode: string | null } | null>;
  };
};

export type CustomerCodeInput = {
  customerType: CustomerType;
  centerCode?: string;
  consultantCode?: string | null;
  joinedAt?: Date;
};

export function normalizeCenterCode(value?: string | null) {
  const digits = (value || DEFAULT_CENTER_CODE).replace(/\D/g, "");
  return digits.padStart(3, "0").slice(-3);
}

export function customerCodePrefix(input: CustomerCodeInput) {
  const year = String((input.joinedAt ?? new Date()).getFullYear()).slice(-2);
  const center = normalizeCenterCode(input.centerCode);

  if (input.customerType === "CONSULTANT") {
    const consultantCode = (input.consultantCode || "")
      .replace(/\D/g, "")
      .padStart(3, "0")
      .slice(-3);

    if (!input.consultantCode) {
      throw new Error("ID consultant wajib untuk customer consultant");
    }

    return `CC.${center}.${year}${consultantCode}`;
  }

  return `DC.${center}.${year}`;
}

export async function nextCustomerCode(
  db: CustomerCodeFinder,
  input: CustomerCodeInput
) {
  const prefix = customerCodePrefix(input);
  const last = await db.customer.findFirst({
    where: { customerCode: { startsWith: prefix } },
    orderBy: { customerCode: "desc" },
    select: { customerCode: true },
  });
  const lastSequence = last?.customerCode
    ? Number.parseInt(last.customerCode.slice(prefix.length), 10)
    : 0;
  const sequenceNo = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

  return {
    customerCode: `${prefix}${String(sequenceNo).padStart(
      CUSTOMER_SEQUENCE_PADDING,
      "0"
    )}`,
    centerCode: normalizeCenterCode(input.centerCode),
    joinYear: (input.joinedAt ?? new Date()).getFullYear(),
    sequenceNo,
  };
}

/**
 * Membuat customer dengan retry saat dua request bersamaan memperoleh nomor
 * urut yang sama. Callback harus melakukan operasi create yang memiliki unique
 * constraint pada `customerCode`.
 */
export async function createWithCustomerCode<T>(
  db: CustomerCodeFinder,
  input: CustomerCodeInput,
  attempt: (code: Awaited<ReturnType<typeof nextCustomerCode>>) => Promise<T>,
  maxAttempts = 5
) {
  let lastError: unknown;

  for (let index = 0; index < maxAttempts; index += 1) {
    const code = await nextCustomerCode(db, input);

    try {
      return await attempt(code);
    } catch (error) {
      if ((error as { code?: string })?.code !== "P2002") throw error;
      lastError = error;
    }
  }

  throw lastError ?? new Error("Gagal menghasilkan kode customer unik");
}

