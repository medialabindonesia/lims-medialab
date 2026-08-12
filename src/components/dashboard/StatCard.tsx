import { LucideIcon } from "lucide-react";
import StatCardShell from "./StatCardShell";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  /** Urutan kartu untuk efek stagger (opsional). */
  index?: number;
};

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  index = 0,
}: StatCardProps) {
  // Tetap Server Component: ikon (function) dirender di sini, tidak dilewatkan
  // sebagai prop ke client. Animasi ditangani oleh StatCardShell (client).
  return (
    <StatCardShell index={index}>
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-blue-700 transition-transform duration-200 group-hover:scale-105">
          <Icon size={19} />
        </div>
        <span className="h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_0_5px_rgba(111,188,29,0.12)]" />
      </div>

      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </h2>

      {description && (
        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </StatCardShell>
  );
}
