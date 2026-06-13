import { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
};

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:bg-white/10">
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
          <Icon size={22} />
        </div>
      </div>

      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="mt-2 text-3xl font-bold">{value}</h2>

      {description && (
        <p className="mt-3 text-sm text-slate-400">{description}</p>
      )}
    </div>
  );
}