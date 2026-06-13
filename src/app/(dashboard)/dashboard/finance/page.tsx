import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import MotionHeader from "@/components/layout/MotionHeader";
import { BadgeDollarSign, Receipt, Wallet } from "lucide-react";

export default async function FinanceDashboardPage() {
  const [draft, waitingApproval, approved] = await Promise.all([
    prisma.invoice.count({ where: { status: "DRAFT" } }),
    prisma.invoice.count({ where: { status: "WAITING_APPROVAL" } }),
    prisma.invoice.count({ where: { status: "APPROVED" } }),
  ]);

  return (
    <section>
      <MotionHeader
        eyebrow="Finance Dashboard"
        title="Invoice Monitoring"
        subtitle="Monitoring pembuatan invoice, approval invoice, dan status pembayaran."
      />

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard index={0} title="Draft Invoice" value={draft} icon={Receipt} />
        <StatCard index={1} title="Waiting Approval" value={waitingApproval} icon={Wallet} />
        <StatCard index={2} title="Approved Invoice" value={approved} icon={BadgeDollarSign} />
      </div>
    </section>
  );
}