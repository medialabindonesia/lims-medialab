import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, BadgeCheck, Clock3, FileCheck2, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import MonthNavigator from "@/components/sales/MonthNavigator";

function monthRange(raw?: string) {
  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 1);
  return { from, to, key: `${year}-${String(monthIndex + 1).padStart(2, "0")}` };
}

export default async function SalesMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await canAccessMenu(session.roleId, "sales.monitoring"))) redirect("/dashboard");

  const { month } = await searchParams;
  const range = monthRange(month);
  const quotations = await prisma.quotation.findMany({
    where: { createdAt: { gte: range.from, lt: range.to } },
    select: {
      id: true,
      quotationNo: true,
      status: true,
      requestedById: true,
      grandTotal: true,
      createdAt: true,
      customer: { select: { id: true, name: true, company: true } },
      _count: { select: { ltrs: true, cocs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const userIds = [...new Set(quotations.map((item) => item.requestedById).filter(Boolean))] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, role: { select: { name: true } } },
      })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const byCreator = new Map<string, { name: string; email: string; count: number; approved: number; rejected: number }>();
  const byCustomer = new Map<string, { name: string; count: number; value: number }>();
  const byStatus = new Map<string, number>();
  for (const quote of quotations) {
    const creator = quote.requestedById ? userMap.get(quote.requestedById) : null;
    const creatorKey = creator?.id || "system";
    const creatorRow = byCreator.get(creatorKey) || {
      name: creator?.name || "Sistem / akun lama",
      email: creator?.email || "-",
      count: 0,
      approved: 0,
      rejected: 0,
    };
    creatorRow.count += 1;
    if (["APPROVED", "PO_UPLOADED", "LTR_CREATED", "COC_CREATED"].includes(quote.status)) creatorRow.approved += 1;
    if (quote.status === "REJECTED") creatorRow.rejected += 1;
    byCreator.set(creatorKey, creatorRow);

    const customerRow = byCustomer.get(quote.customer.id) || {
      name: quote.customer.company || quote.customer.name,
      count: 0,
      value: 0,
    };
    customerRow.count += 1;
    customerRow.value += quote.grandTotal;
    byCustomer.set(quote.customer.id, customerRow);
    byStatus.set(quote.status, (byStatus.get(quote.status) || 0) + 1);
  }

  const cards = [
    { label: "Quotation bulan ini", value: quotations.length, icon: BarChart3, tone: "bg-blue-50 text-blue-800" },
    { label: "Perlu verifikasi staff", value: byStatus.get("CONFIRMED") || 0, icon: FileCheck2, tone: "bg-cyan-50 text-cyan-800" },
    { label: "Perlu approval manager", value: byStatus.get("VERIFIED") || 0, icon: Clock3, tone: "bg-amber-50 text-amber-800" },
    { label: "Disetujui", value: ["APPROVED", "PO_UPLOADED", "LTR_CREATED", "COC_CREATED"].reduce((sum, status) => sum + (byStatus.get(status) || 0), 0), icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-800" },
    { label: "Ditolak / perlu revisi", value: (byStatus.get("REJECTED") || 0) + (byStatus.get("REVISION") || 0), icon: XCircle, tone: "bg-red-50 text-red-800" },
  ];

  return (
    <section className="space-y-6 pb-24 lg:pb-0">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">Sales Intelligence</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Monitoring Quotation</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Jumlah quotation, pembuat per akun, customer, nilai, dan antrian status dalam satu layar bulanan.</p>
          </div>
          <MonthNavigator month={range.key} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className={`rounded-2xl border border-white p-5 shadow-sm ${tone}`}>
            <Icon size={20} />
            <p className="mt-4 text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs font-bold">{label}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Dibuat oleh akun</h2>
          <div className="mt-4 grid gap-3">
            {[...byCreator.values()].sort((a, b) => b.count - a.count).map((row) => (
              <div key={`${row.email}-${row.name}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div><p className="font-black text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></div>
                <p className="text-sm"><strong>{row.count}</strong><br /><span className="text-xs text-slate-400">dibuat</span></p>
                <p className="text-sm text-emerald-700"><strong>{row.approved}</strong><br /><span className="text-xs">disetujui</span></p>
                <p className="text-sm text-red-700"><strong>{row.rejected}</strong><br /><span className="text-xs">ditolak</span></p>
              </div>
            ))}
            {byCreator.size === 0 && <p className="py-8 text-center text-sm text-slate-400">Belum ada quotation pada bulan ini.</p>}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Per akun customer</h2>
          <div className="mt-4 grid gap-3">
            {[...byCustomer.values()].sort((a, b) => b.count - a.count).map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div><p className="font-black text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.value)}</p></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-800">{row.count}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-900">Quotation terbaru</h2><Link href="/quotations/approve" className="text-sm font-bold text-blue-700">Buka antrian approval →</Link></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quotations.slice(0, 12).map((quote) => (
            <div key={quote.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-900">{quote.quotationNo}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{quote.status}</span></div>
              <p className="mt-2 text-xs text-slate-500">{quote.customer.company || quote.customer.name}</p>
              <p className="mt-3 text-[11px] text-slate-400">{quote._count.ltrs} LTR · {quote._count.cocs} COC · {userMap.get(quote.requestedById || "")?.name || "Sistem"}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
