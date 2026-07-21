import Skeleton from "@/components/ui/Skeleton";

export default function SupportDeskLoading() {
  return (
    <section className="min-h-screen">
      {/* Header + stat tiles */}
      <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-56" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Ticket rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="hidden h-7 w-28 rounded-full sm:block" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
