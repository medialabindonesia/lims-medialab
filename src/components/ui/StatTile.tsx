"use client";

import type { ElementType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { fadeUpItem } from "@/lib/motion";
import { cn } from "@/lib/cn";

type StatTileProps = {
  title: string;
  value: number | string;
  help?: string;
  icon: ElementType;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

/**
 * Kartu statistik ringkas — dirancang untuk grid 2 kolom di mobile
 * (lebar ±170px) sehingga empat metrik muat dalam satu layar, bukan
 * satu kartu setinggi layar seperti versi sebelumnya.
 */
export default function StatTile({
  title,
  value,
  help,
  icon: Icon,
  active = false,
  onClick,
  className,
}: StatTileProps) {
  const reduce = useReducedMotion();
  const interactive = typeof onClick === "function";
  const Comp = interactive ? motion.button : motion.div;

  return (
    <Comp
      {...(interactive
        ? { type: "button" as const, onClick, "aria-pressed": active }
        : {})}
      variants={reduce ? undefined : fadeUpItem}
      whileHover={reduce || !interactive ? undefined : { y: -2 }}
      className={cn(
        "group flex min-h-[6.5rem] flex-col rounded-2xl border p-3.5 text-left transition-colors sm:min-h-0 sm:rounded-[1.25rem] sm:p-4",
        active
          ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
          : "border-slate-200 bg-white",
        interactive && !active && "hover:border-emerald-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform sm:h-10 sm:w-10 sm:rounded-2xl",
            interactive && "group-hover:scale-105",
            active
              ? "bg-emerald-500 text-white"
              : "bg-emerald-100 text-emerald-600"
          )}
        >
          <Icon size={18} />
        </span>

        <span className="min-w-0 text-right">
          <span className="block text-2xl font-black leading-none text-slate-900 sm:text-3xl">
            {value}
          </span>
        </span>
      </div>

      <p className="mt-2.5 text-[13px] font-bold leading-tight text-slate-700 sm:text-sm">
        {title}
      </p>

      {help && (
        <p className="mt-1 flex items-center gap-1 text-[11px] leading-tight text-slate-400">
          {active && <CheckCircle2 size={11} className="shrink-0 text-emerald-500" />}
          <span className="truncate">{active ? "Ketuk untuk reset" : help}</span>
        </p>
      )}
    </Comp>
  );
}
