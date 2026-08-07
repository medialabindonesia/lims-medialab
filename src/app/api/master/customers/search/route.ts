import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { quotationChecks } from "@/lib/quotation-access";

/**
 * Pencarian customer untuk dropdown form quotation.
 *
 * Dibuat terpisah dari GET /api/master/customers karena daftar customer asli
 * Medialab berjumlah ratusan mendekati ribuan. Memuat seluruhnya ke payload
 * halaman membuat form quotation berat; di sini pencarian dilakukan di sisi
 * server dan hanya sejumlah kecil baris yang dikirim.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const permission = await requireAnyApiPermission([
    ...quotationChecks("canView"),
    { menuKey: "master.customers", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") || "").trim();
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const session = permission.session;

  // Role customer hanya boleh melihat dirinya sendiri, sama seperti aturan
  // pada getQuotationPageData.
  const scopeWhere =
    session?.roleCode === "CUSTOMER_ENGAGEMENT" && session.customerId
      ? { id: session.customerId, isActive: true }
      : { isActive: true };

  const searchWhere = rawQuery
    ? {
        OR: [
          { name: { contains: rawQuery } },
          { company: { contains: rawQuery } },
          { city: { contains: rawQuery } },
          { contactPerson: { contains: rawQuery } },
        ],
      }
    : {};

  const where = { ...scopeWhere, ...searchWhere };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        company: true,
        city: true,
        province: true,
        contactPerson: true,
        email: true,
        phone: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    query: rawQuery,
    customers,
    total,
    hasMore: total > customers.length,
  });
}
