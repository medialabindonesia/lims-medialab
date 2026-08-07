import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyApiPermission } from "@/lib/api-permission";
import { quotationChecks } from "@/lib/quotation-access";

/**
 * Pohon matriks pengujian beserta regulasi yang menempel di tiap simpul.
 *
 * Dikirim sekaligus sebagai satu pohon karena jumlah simpulnya kecil (puluhan),
 * sementara cascade di form quotation butuh mengetahui apakah sebuah simpul
 * masih punya anak agar tahu kapan berhenti menampilkan dropdown berikutnya.
 */

export type MatrixNode = {
  id: string;
  code: string;
  name: string;
  note: string | null;
  regulations: Array<{
    id: string;
    code: string;
    name: string;
    shortName: string | null;
    note: string | null;
    parameterCount: number;
  }>;
  children: MatrixNode[];
};

export async function GET() {
  const permission = await requireAnyApiPermission([
    ...quotationChecks("canView"),
    { menuKey: "master.parameters", action: "canView" },
  ]);

  if (!permission.allowed) return permission.response;

  const [matrices, regulations, parameterCounts] = await Promise.all([
    prisma.matrix.findMany({
      where: { isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, parentId: true, code: true, name: true, note: true },
    }),
    prisma.regulation.findMany({
      where: { isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: {
        id: true,
        matrixId: true,
        code: true,
        name: true,
        shortName: true,
        note: true,
      },
    }),
    prisma.regulationParameter.groupBy({
      by: ["regulationId"],
      where: { isActive: true },
      _count: { _all: true },
    }),
  ]);

  const countByRegulation = new Map(
    parameterCounts.map((row) => [row.regulationId, row._count._all])
  );

  const regulationsByMatrix = new Map<string, MatrixNode["regulations"]>();
  for (const regulation of regulations) {
    const list = regulationsByMatrix.get(regulation.matrixId) ?? [];
    list.push({
      id: regulation.id,
      code: regulation.code,
      name: regulation.name,
      shortName: regulation.shortName,
      note: regulation.note,
      parameterCount: countByRegulation.get(regulation.id) ?? 0,
    });
    regulationsByMatrix.set(regulation.matrixId, list);
  }

  const nodeById = new Map<string, MatrixNode>();
  for (const matrix of matrices) {
    nodeById.set(matrix.id, {
      id: matrix.id,
      code: matrix.code,
      name: matrix.name,
      note: matrix.note,
      regulations: regulationsByMatrix.get(matrix.id) ?? [],
      children: [],
    });
  }

  const roots: MatrixNode[] = [];
  for (const matrix of matrices) {
    const node = nodeById.get(matrix.id);
    if (!node) continue;

    const parent = matrix.parentId ? nodeById.get(matrix.parentId) : null;

    // Simpul yang induknya nonaktif diperlakukan sebagai akar agar tidak
    // hilang diam-diam dari cascade.
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json({ matrices: roots });
}
