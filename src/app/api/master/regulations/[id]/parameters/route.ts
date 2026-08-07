import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { quotationChecks } from "@/lib/quotation-access";

/**
 * Parameter uji yang berlaku pada sebuah regulasi, lengkap dengan metode,
 * durasi yang sah, dan baku mutu per durasi.
 *
 * Dipakai saat sales memilih regulasi di Step 2: seluruh parameter dimuat
 * dalam keadaan tercentang (`defaultSelected`), lalu tinggal di-untick.
 */

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await requireAnyApiPermission([
    ...quotationChecks("canView"),
    { menuKey: "master.parameters", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const { id } = await context.params;

  const regulation = await prisma.regulation.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      note: true,
      matrix: { select: { id: true, code: true, name: true } },
    },
  });

  if (!regulation) {
    return NextResponse.json(
      { message: "Regulasi tidak ditemukan" },
      { status: 404 }
    );
  }

  const rows = await prisma.regulationParameter.findMany({
    where: { regulationId: id, isActive: true },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    select: {
      id: true,
      parameterId: true,
      displayName: true,
      unit: true,
      method: true,
      limitValue: true,
      basePrice: true,
      isAccredited: true,
      defaultSelected: true,
      parameter: { select: { name: true, unit: true, method: true } },
      durations: {
        orderBy: [{ sort: "asc" }],
        select: {
          id: true,
          limitValue: true,
          isDefault: true,
          duration: {
            select: { id: true, code: true, label: true, minutes: true },
          },
        },
      },
    },
  });

  const parameters = rows.map((row) => ({
    regulationParameterId: row.id,
    parameterId: row.parameterId,
    name: row.displayName || row.parameter.name,
    unit: row.unit ?? row.parameter.unit,
    method: row.method ?? row.parameter.method,
    limitValue: row.limitValue,
    // null berarti harga dasar belum ditetapkan, bukan gratis.
    basePrice: row.basePrice,
    isAccredited: row.isAccredited,
    defaultSelected: row.defaultSelected,
    durations: row.durations.map((entry) => ({
      id: entry.duration.id,
      code: entry.duration.code,
      label: entry.duration.label,
      limitValue: entry.limitValue,
      isDefault: entry.isDefault,
    })),
  }));

  return NextResponse.json({
    regulation,
    parameters,
    unpricedCount: parameters.filter((p) => p.basePrice === null).length,
  });
}
