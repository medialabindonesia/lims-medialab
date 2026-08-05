import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import MotionHeader from "@/components/layout/MotionHeader";
import Link from "next/link";
import { BadgeCheck, BarChart3, ClipboardPen, FileCheck, RefreshCcw, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";

export default async function WorkerDashboardPage() {
  const session = await getSession();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [requestedQuotation, verifiedQuotation, rejectedQuotation, monthlyQuotation, enteredResults, retest] =
    await Promise.all([
      prisma.quotation.count({ where: { status: "CONFIRMED" } }),
      prisma.quotation.count({ where: { status: "VERIFIED" } }),
      prisma.quotation.count({ where: { status: "REJECTED" } }),
      prisma.quotation.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.sampleParameter.count({ where: { status: "ENTERED" } }),
      prisma.sample.count({ where: { status: "RETEST" } }),
    ]);

  const isSalesManager = session?.roleCode === "SALES_MANAGER_DIRECTOR";

  return (
    <section>
      <MotionHeader
        eyebrow="Worker Dashboard"
        title="Operational Queue"
        subtitle={isSalesManager
          ? "Ringkasan quotation yang perlu keputusan manager dan monitoring aktivitas sales bulan ini."
          : "Dashboard pekerjaan untuk sales, supervisor, analyst, technical, dan manager."}
      />

      {isSalesManager ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Link href="/quotations/approve"><StatCard index={0} title="Perlu Approval" value={verifiedQuotation} icon={BadgeCheck} /></Link>
            <Link href="/sales/monitoring"><StatCard index={1} title="Quotation Bulan Ini" value={monthlyQuotation} icon={BarChart3} /></Link>
            <Link href="/sales/monitoring"><StatCard index={2} title="Perlu Verifikasi Staff" value={requestedQuotation} icon={FileCheck} /></Link>
            <Link href="/sales/monitoring"><StatCard index={3} title="Ditolak / Revisi" value={rejectedQuotation} icon={XCircle} /></Link>
          </div>
          <div className="mt-6 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-900">Tindakan manager</p>
            <p className="mt-1 text-sm text-slate-500">Klik kartu “Perlu Approval” untuk melihat daftar quotation VERIFIED, lalu approve atau tolak dengan catatan yang langsung diterima sales staff.</p>
          </div>
        </>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard index={0} title="Perlu Verifikasi" value={requestedQuotation} icon={FileCheck} />
          <StatCard index={1} title="Verified Quotation" value={verifiedQuotation} icon={BadgeCheck} />
          <StatCard index={2} title="Entered Results" value={enteredResults} icon={ClipboardPen} />
          <StatCard index={3} title="Retest Sample" value={retest} icon={RefreshCcw} />
        </div>
      )}
    </section>
  );
}
