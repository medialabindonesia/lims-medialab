import { redirect } from "next/navigation";
import { CalendarRange, Clock3, MapPin, UsersRound } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessMenu } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import MonthNavigator from "@/components/sales/MonthNavigator";

function monthRange(raw?: string) {
  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  return {
    from: new Date(year, monthIndex, 1),
    to: new Date(year, monthIndex + 1, 1),
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
  };
}

export default async function SamplingSchedulePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await canAccessMenu(session.roleId, "sales.sampling_schedule"))) redirect("/dashboard");
  const range = monthRange((await searchParams).month);
  const schedules = await prisma.coc.findMany({
    where: { plannedSamplingStart: { gte: range.from, lt: range.to } },
    include: {
      quotation: { include: { customer: true } },
      items: { include: { quotationItem: { include: { parameter: true } } } },
      sample: true,
    },
    orderBy: { plannedSamplingStart: "asc" },
  });
  const team = new Map<string, number>();
  for (const schedule of schedules) {
    const names = (schedule.samplerName || "Belum ditentukan")
      .split(/[,;/&]+/)
      .map((name) => name.trim())
      .filter(Boolean);
    for (const name of names) team.set(name, (team.get(name) || 0) + 1);
  }
  const formatDate = (date: Date | null) => date
    ? new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date)
    : "Belum dijadwalkan";

  return (
    <section className="space-y-6 pb-24 lg:pb-0">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-bold text-blue-600">Sampling Operations</p><h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Resume Tim Sampling</h1><p className="mt-2 text-sm text-slate-500">Jadwal, penanggung jawab, lokasi, dan ruang lingkup sampling bulan terpilih.</p></div>
          <MonthNavigator month={range.key} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-blue-50 p-5 text-blue-800"><CalendarRange size={20} /><p className="mt-3 text-3xl font-black">{schedules.length}</p><p className="text-xs font-bold">jadwal sampling</p></div>
        <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800"><UsersRound size={20} /><p className="mt-3 text-3xl font-black">{team.size}</p><p className="text-xs font-bold">petugas/tim terjadwal</p></div>
        <div className="rounded-2xl bg-amber-50 p-5 text-amber-800"><Clock3 size={20} /><p className="mt-3 text-3xl font-black">{schedules.filter((item) => item.plannedSamplingEnd).length}</p><p className="text-xs font-bold">jadwal lengkap</p></div>
      </div>

      <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Beban per tim/petugas</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[...team.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => <span key={name} className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">{name} · {count} jadwal</span>)}
          {team.size === 0 && <p className="text-sm text-slate-400">Belum ada tim sampling yang dijadwalkan.</p>}
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        {schedules.map((schedule) => (
          <article key={schedule.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-blue-600">{schedule.cocNo} · {schedule.groupLabel || `Bagian ${schedule.sequence}`}</p><h2 className="mt-1 text-lg font-black text-slate-900">{schedule.quotation.customer.company || schedule.quotation.customer.name}</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{schedule.tatRequested || "NORMAL"}</span></div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-slate-400">Mulai</span><br /><strong>{formatDate(schedule.plannedSamplingStart)}</strong></p><p><span className="text-slate-400">Selesai</span><br /><strong>{formatDate(schedule.plannedSamplingEnd)}</strong></p><p><span className="text-slate-400">Tim</span><br /><strong>{schedule.samplerName || "Belum ditentukan"}</strong></p><p className="flex gap-2"><MapPin size={15} className="mt-1 shrink-0 text-blue-600" /><strong>{schedule.samplingLocation || "Lokasi belum diisi"}</strong></p></div>
            <div className="mt-4 flex flex-wrap gap-2">{schedule.items.map(({ quotationItem }) => <span key={quotationItem.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{quotationItem.customerSampleId || quotationItem.description || quotationItem.parameter.name}</span>)}</div>
          </article>
        ))}
        {schedules.length === 0 && <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-400 xl:col-span-2">Belum ada jadwal sampling pada bulan ini.</div>}
      </div>
    </section>
  );
}
