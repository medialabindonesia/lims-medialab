import Skeleton from "@/components/ui/Skeleton";

/** Deretan bubble chat kiri-kanan sebagai placeholder thread. */
export function ChatBubblesSkeleton() {
  const rows: ("left" | "right")[] = ["left", "right", "left", "right", "left"];
  const widths = ["w-2/3", "w-1/2", "w-3/5", "w-2/5", "w-1/2"];

  return (
    <div className="flex h-full flex-col gap-4 p-2">
      {rows.map((side, index) => (
        <div
          key={index}
          className={`flex items-end gap-2.5 ${
            side === "right" ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className={`h-14 ${widths[index]} max-w-[78%] rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}
