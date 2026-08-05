import {
  STATUS_DOT_CLASS,
  STATUS_TONE_CLASS,
  type StatusTone,
} from "@/lib/customer-labels";
import { cn } from "@/lib/cn";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  className?: string;
};

/** Badge status dengan titik warna — ukuran seragam di seluruh area customer. */
export default function StatusBadge({
  label,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-tight sm:text-xs",
        STATUS_TONE_CLASS[tone],
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[tone])}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
