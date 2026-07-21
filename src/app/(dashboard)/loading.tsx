import Skeleton, { SkeletonText } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <section className="min-h-screen">
      {/* Header */}
      <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-72 max-w-full" />
        <div className="mt-4 max-w-2xl">
          <SkeletonText lines={2} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="mt-5 h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
