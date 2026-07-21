/**
 * Skeleton primitive — kotak "breathing" (napas + shimmer) via class .skeleton
 * di globals.css. Hormati prefers-reduced-motion secara otomatis.
 *
 * Contoh:
 *   <Skeleton className="h-4 w-40" />
 *   <Skeleton className="h-24 w-full rounded-2xl" />
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/** Baris teks skeleton dengan lebar bervariasi supaya terlihat natural. */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-3/4", "w-2/3"];
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-3.5 ${widths[index % widths.length]}`}
        />
      ))}
    </div>
  );
}
