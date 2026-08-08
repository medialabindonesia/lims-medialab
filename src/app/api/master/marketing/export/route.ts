import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import {
  buildMarketingMasterWorkbook,
  type MarketingMasterExport,
} from "@/lib/marketing-master-workbook";

export const runtime = "nodejs";

/**
 * Mengunduh seluruh master marketing sebagai Excel yang SIAP DISUNTING.
 *
 * Berkas ini bukan template kosong: isinya keadaan sekarang. Berkas yang sama
 * dipakai untuk mengunggah balik lewat /api/master/marketing/import, sehingga
 * orang sales cukup mengoreksi sel dan menambah baris.
 */
export async function GET() {
  const permission = await requireAnyApiPermission([
    { menuKey: "master.marketing", action: "canView" },
    { menuKey: "master.parameters", action: "canView" },
    { menuKey: "admin.rbac", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const [matrices, regulations, parameters] = await Promise.all([
    prisma.matrix.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: {
        code: true,
        name: true,
        note: true,
        sort: true,
        isActive: true,
        parent: { select: { code: true } },
      },
    }),
    prisma.regulation.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: {
        code: true,
        name: true,
        shortName: true,
        note: true,
        sort: true,
        isActive: true,
        matrix: { select: { code: true } },
      },
    }),
    prisma.regulationParameter.findMany({
      orderBy: [{ regulationId: "asc" }, { sort: "asc" }],
      select: {
        displayName: true,
        unit: true,
        method: true,
        limitValue: true,
        basePrice: true,
        isAccredited: true,
        defaultSelected: true,
        sort: true,
        isActive: true,
        regulation: { select: { code: true } },
        parameter: { select: { name: true, unit: true, method: true } },
        durations: {
          orderBy: { sort: "asc" },
          select: {
            limitValue: true,
            isDefault: true,
            duration: { select: { label: true } },
          },
        },
      },
    }),
  ]);

  const data: MarketingMasterExport = {
    matrices: matrices.map((item) => ({
      code: item.code,
      name: item.name,
      parentCode: item.parent?.code ?? null,
      note: item.note,
      sort: item.sort,
      isActive: item.isActive,
    })),
    regulations: regulations.map((item) => ({
      code: item.code,
      name: item.name,
      shortName: item.shortName,
      matrixCode: item.matrix.code,
      note: item.note,
      sort: item.sort,
      isActive: item.isActive,
    })),
    parameters: parameters.map((item) => ({
      regulationCode: item.regulation.code,
      parameterName: item.parameter.name,
      displayName: item.displayName,
      unit: item.unit ?? item.parameter.unit,
      method: item.method ?? item.parameter.method,
      limitValue: item.limitValue,
      basePrice: item.basePrice,
      durations: item.durations.map((entry) => ({
        label: entry.duration.label,
        limitValue: entry.limitValue,
        isDefault: entry.isDefault,
      })),
      isAccredited: item.isAccredited,
      defaultSelected: item.defaultSelected,
      sort: item.sort,
      isActive: item.isActive,
    })),
  };

  const workbook = buildMarketingMasterWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="master-marketing-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
