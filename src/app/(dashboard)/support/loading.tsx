import Skeleton from "@/components/ui/Skeleton";

export default function SupportCenterLoading() {
  return (
    <section className="min-h-screen">
      {/* Header banner */}
      <div className="mb-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/80 to-sky-500/80 p-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl !bg-white/40" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 !bg-white/40" />
            <Skeleton className="h-7 w-64 max-w-full !bg-white/40" />
          </div>
        </div>
        <Skeleton className="mt-6 h-12 w-full rounded-2xl !bg-white/60" />
      </div>

      {/* Topic cards */}
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* My tickets */}
      <Skeleton className="mb-4 mt-8 h-5 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
