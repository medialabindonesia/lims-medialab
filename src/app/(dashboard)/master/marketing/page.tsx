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
