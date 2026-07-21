import Skeleton from "@/components/ui/Skeleton";

export default function FaqAdminLoading() {
  return (
    <section className="min-h-screen">
      <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <Skeleton className="mt-5 h-10 w-64 rounded-xl" />
      </div>

      <div className="mb-4 flex justify-end">
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}
