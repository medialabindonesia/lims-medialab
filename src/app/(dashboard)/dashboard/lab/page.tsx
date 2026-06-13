import { prisma } from "@/lib/db";
import StatCard from "@/components/dashboard/StatCard";
import MotionHeader from "@/components/layout/MotionHeader";
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
      <MotionHeader
        eyebrow="Lab Dashboard"
        title="Laboratory Workflow"
        subtitle="Alur lab dari receive sample, distribute parameter, analyst input result, supervisor review, sampai manager validate."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} title="Received Sample" value={received} icon={PackageCheck} />
        <StatCard index={1} title="In Analysis" value={inAnalysis} icon={FlaskConical} />
        <StatCard index={2} title="Entered Result" value={entered} icon={ClipboardPen} />
        <StatCard index={3} title="Validated Sample" value={validated} icon={ShieldCheck} />
      </div>
    </section>
  );
}