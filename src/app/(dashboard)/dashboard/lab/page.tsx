import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import {
  ClipboardPen,
  FlaskConical,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

export default async function LabDashboardPage() {
  const [received, inAnalysis, entered, validated] = await Promise.all([
    prisma.sample.count({ where: { status: "RECEIVED" } }),
    prisma.sample.count({ where: { status: "IN_ANALYSIS" } }),
    prisma.sampleParameter.count({ where: { status: "ENTERED" } }),
    prisma.sample.count({ where: { status: "VALIDATED" } }),
  ]);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-300">Lab Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Laboratory Workflow</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Alur lab dari receive sample, distribute parameter, analyst input result, supervisor review, sampai manager validate.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Received Sample" value={received} icon={PackageCheck} />
        <StatCard title="In Analysis" value={inAnalysis} icon={FlaskConical} />
        <StatCard title="Entered Result" value={entered} icon={ClipboardPen} />
        <StatCard title="Validated Sample" value={validated} icon={ShieldCheck} />
      </div>
    </section>
  );
}