import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import MarketingMasterClient, {
  type MatrixTreeNode,
} from "@/components/master/MarketingMasterClient";

export default async function MarketingMasterPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const allowed = await canAccessMenu(session.roleId, "master.marketing");

  if (!allowed) {
    redirect("/dashboard");
  }

  const [matrices, regulations, unpricedCount, totalParameters] =
    await Promise.all([
      prisma.matrix.findMany({
        orderBy: [{ sort: "asc" }, { name: "asc" }],
        select: {
          id: true,
          parentId: true,
          code: true,
          name: true,
          isActive: true,
        },
      }),
      prisma.regulation.findMany({
        orderBy: [{ sort: "asc" }, { name: "asc" }],
        select: {
          id: true,
          matrixId: true,
          code: true,
          name: true,
          isActive: true,
          _count: { select: { parameters: true } },
          parameters: {
            where: { isActive: true },
            orderBy: [{ sort: "asc" }, { displayName: "asc" }],
            select: {
              id: true,
              displayName: true,
              unit: true,
              method: true,
              limitValue: true,
              limitValue2: true,
              samplingMethod: true,
              sampleMatrix: true,
              sampleSize: true,
              basePrice: true,
              isAccredited: true,
              parameter: { select: { name: true, unit: true, method: true } },
              durations: {
                orderBy: { sort: "asc" },
                select: { limitValue: true, isDefault: true, duration: { select: { label: true } } },
              },
            },
          },
        },
      }),
      prisma.regulationParameter.count({
        where: { isActive: true, basePrice: null },
      }),
      prisma.regulationParameter.count({ where: { isActive: true } }),
    ]);

  const nodeById = new Map<string, MatrixTreeNode>(
    matrices.map((matrix) => [
      matrix.id,
      {
        id: matrix.id,
        code: matrix.code,
        name: matrix.name,
        isActive: matrix.isActive,
        regulations: [],
        children: [],
      },
    ])
  );

  for (const regulation of regulations) {
    nodeById.get(regulation.matrixId)?.regulations.push({
      id: regulation.id,
      code: regulation.code,
      name: regulation.name,
      isActive: regulation.isActive,
      parameterCount: regulation._count.parameters,
      parameters: regulation.parameters.map((item) => ({
        id: item.id,
        name: item.displayName || item.parameter.name,
        unit: item.unit || item.parameter.unit,
        method: item.method || item.parameter.method,
        limitValue: item.limitValue,
        limitValue2: item.limitValue2,
        samplingMethod: item.samplingMethod,
        sampleMatrix: item.sampleMatrix,
        sampleSize: item.sampleSize,
        basePrice: item.basePrice,
        isAccredited: item.isAccredited,
        durations: item.durations.map((duration) => ({
          label: duration.duration.label,
          limitValue: duration.limitValue,
          isDefault: duration.isDefault,
        })),
      })),
    });
  }

  const roots: MatrixTreeNode[] = [];

  for (const matrix of matrices) {
    const node = nodeById.get(matrix.id);
    if (!node) continue;

    const parent = matrix.parentId ? nodeById.get(matrix.parentId) : null;

    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">Master Data</p>
        <h1 className="mt-2 text-4xl font-bold">Matriks, Regulasi &amp; Harga</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Sumber data yang dipakai form quotation: jenis contoh uji, baku mutu
          acuan, parameter uji beserta metode, durasi, dan harga dasarnya.
          Pengisian massal dilakukan lewat Excel.
        </p>
      </div>

      <MarketingMasterClient
        tree={roots}
        totalParameters={totalParameters}
        unpricedCount={unpricedCount}
      />
    </section>
  );
}
