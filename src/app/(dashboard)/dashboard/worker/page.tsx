import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import MotionHeader from "@/components/layout/MotionHeader";
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
      <MotionHeader
        eyebrow="Worker Dashboard"
        title="Operational Queue"
        subtitle="Dashboard pekerjaan untuk sales, supervisor, analyst, technical, dan manager."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} title="Request Quotation" value={requestedQuotation} icon={FileCheck} />
        <StatCard index={1} title="Verified Quotation" value={verifiedQuotation} icon={BadgeCheck} />
        <StatCard index={2} title="Entered Results" value={enteredResults} icon={ClipboardPen} />
        <StatCard index={3} title="Retest Sample" value={retest} icon={RefreshCcw} />
      </div>
    </section>
  );
}