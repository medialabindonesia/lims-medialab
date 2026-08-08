import { prisma } from "../src/lib/db";
async function main() {
  const groups = await prisma.quotationGroup.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      description: true,
      matrixId: true,
      regulationId: true,
      quotation: { select: { quotationNo: true } },
      matrix: { select: { name: true } },
      regulation: { select: { name: true, shortName: true } },
    },
  });
  for (const g of groups) {
    console.log(
      g.quotation.quotationNo.padEnd(20),
      `desc=${JSON.stringify(g.description)}`.padEnd(28),
      `matrix=${g.matrix?.name ?? "null"}`.padEnd(28),
      `regShort=${JSON.stringify(g.regulation?.shortName ?? null)}`
    );
  }
  process.exit(0);
}
main();
