import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import StatCard from "@/components/dashboard/StatCard";
import MotionHeader from "@/components/layout/MotionHeader";
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
      <MotionHeader
        eyebrow="Customer Dashboard"
        title="Customer Engagement Portal"
        subtitle="Alur customer dari request quotation, kirim sample, review preliminary COA, sampai final COA dan invoice."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} title="Quotation" value={quotations} icon={FilePlus} />
        <StatCard index={1} title="Sample" value={samples} icon={PackageCheck} />
        <StatCard index={2} title="Preliminary COA" value={preliminaryCoa} icon={FileBadge} />
        <StatCard index={3} title="Invoice" value={invoices} icon={Receipt} />
      </div>
    </section>
  );
}