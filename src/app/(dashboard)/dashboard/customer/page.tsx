import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import StatCard from "@/components/dashboard/StatCard";
import { FileBadge, FilePlus, PackageCheck, Receipt } from "lucide-react";

export default async function CustomerDashboardPage() {
  const session = await getSession();

  const customerId = session?.customerId || undefined;

  const [quotations, samples, preliminaryCoa, invoices] = await Promise.all([
    prisma.quotation.count({
      where: customerId ? { customerId } : undefined,
    }),
    prisma.sample.count({
      where: customerId ? { customerId } : undefined,
    }),
    prisma.coa.count({
      where: {
        type: "PRELIMINARY",
      },
    }),
    prisma.invoice.count(),
  ]);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Customer Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Customer Engagement Portal</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Alur customer dari request quotation, kirim sample, review preliminary COA, sampai final COA dan invoice.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Quotation" value={quotations} icon={FilePlus} />
        <StatCard title="Sample" value={samples} icon={PackageCheck} />
        <StatCard title="Preliminary COA" value={preliminaryCoa} icon={FileBadge} />
        <StatCard title="Invoice" value={invoices} icon={Receipt} />
      </div>
    </section>
  );
}