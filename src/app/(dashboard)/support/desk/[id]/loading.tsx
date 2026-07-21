import Skeleton from "@/components/ui/Skeleton";
import { ChatBubblesSkeleton } from "@/components/support/ChatSkeleton";

export default function AgentConversationLoading() {
  return (
    <section className="min-h-screen">
      <Skeleton className="mb-4 h-4 w-24" />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Conversation */}
        <div className="flex min-h-[70vh] flex-col">
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <Skeleton className="h-5 w-56 max-w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>

          <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <ChatBubblesSkeleton />
          </div>

          <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-full rounded-xl" />
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
