import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import { BadgeDollarSign, Receipt, Wallet } from "lucide-react";

export default async function FinanceDashboardPage() {
  const [draft, waitingApproval, approved] = await Promise.all([
    prisma.invoice.count({ where: { status: "DRAFT" } }),
    prisma.invoice.count({ where: { status: "WAITING_APPROVAL" } }),
    prisma.invoice.count({ where: { status: "APPROVED" } }),
  ]);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Finance Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Invoice Monitoring</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Monitoring pembuatan invoice, approval invoice, dan status pembayaran.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Draft Invoice" value={draft} icon={Receipt} />
        <StatCard title="Waiting Approval" value={waitingApproval} icon={Wallet} />
        <StatCard title="Approved Invoice" value={approved} icon={BadgeDollarSign} />
      </div>
    </section>
  );
}