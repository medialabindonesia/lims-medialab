import type { PermissionAction } from "@/lib/api-permission";

/**
 * Menu yang dipakai alur quotation. Endpoint master yang diakses dari dalam
 * form quotation (customer, matriks, regulasi, parameter) harus menerima
 * salah satu dari menu ini, bukan hanya `master.*`, karena sales umumnya
 * tidak diberi izin menu Master Data.
 */
export const QUOTATION_MENU_KEYS = [
  "quotation.request",
  "quotation.verify",
  "quotation.revise",
  "quotation.approve",
] as const;

export function quotationChecks(action: PermissionAction) {
  return QUOTATION_MENU_KEYS.map((menuKey) => ({ menuKey, action }));
}
