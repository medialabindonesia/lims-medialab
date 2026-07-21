import Skeleton from "@/components/ui/Skeleton";
import { ChatBubblesSkeleton } from "@/components/support/ChatSkeleton";

export default function CustomerChatLoading() {
  return (
    <section className="flex min-h-[calc(100vh-2rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-56 max-w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Thread */}
      <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <ChatBubblesSkeleton />
      </div>

      {/* Composer */}
      <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
    </section>
  );
}
