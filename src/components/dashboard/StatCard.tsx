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
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 p-3 text-blue-700 ring-1 ring-blue-100 transition-transform duration-300 group-hover:scale-110">
          <Icon size={22} />
        </div>
        <span className="h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_0_5px_rgba(111,188,29,0.12)]" />
      </div>

      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h2 className="mt-1.5 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </h2>

      {description && (
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      )}
    </StatCardShell>
  );
}
