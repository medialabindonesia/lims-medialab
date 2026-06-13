import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import { BadgeCheck, ClipboardPen, FileCheck, RefreshCcw } from "lucide-react";

export default async function WorkerDashboardPage() {
  const [requestedQuotation, verifiedQuotation, enteredResults, retest] =
    await Promise.all([
      prisma.quotation.count({ where: { status: "REQUESTED" } }),
      prisma.quotation.count({ where: { status: "VERIFIED" } }),
      prisma.sampleParameter.count({ where: { status: "ENTERED" } }),
      prisma.sample.count({ where: { status: "RETEST" } }),
    ]);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Worker Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Operational Queue</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Dashboard pekerjaan untuk sales, supervisor, analyst, technical, dan manager.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Request Quotation" value={requestedQuotation} icon={FileCheck} />
        <StatCard title="Verified Quotation" value={verifiedQuotation} icon={BadgeCheck} />
        <StatCard title="Entered Results" value={enteredResults} icon={ClipboardPen} />
        <StatCard title="Retest Sample" value={retest} icon={RefreshCcw} />
      </div>
    </section>
  );
}