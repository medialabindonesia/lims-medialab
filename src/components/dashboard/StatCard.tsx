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
        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 transition-transform duration-300 group-hover:scale-110">
          <Icon size={22} />
        </div>
      </div>

      <p className="text-sm text-slate-400">{title}</p>
      <h2 className="mt-2 text-3xl font-bold">{value}</h2>

      {description && (
        <p className="mt-3 text-sm text-slate-400">{description}</p>
      )}
    </StatCardShell>
  );
}
