"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/cn";

type DisclosureProps = {
  label: string;
  /** Angka kecil di samping label, mis. jumlah item yang disembunyikan. */
  count?: number | string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Bagian yang bisa dibuka-tutup. Dipakai untuk menyembunyikan detail padat
 * (riwayat status, daftar parameter, kode dokumen lengkap) sehingga kartu di
 * mobile tetap pendek tapi informasinya tidak hilang.
 */
export default function Disclosure({
  label,
  count,
  children,
  defaultOpen = false,
  className,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const panelId = useId();

  return (
    <div className={cn("relative z-10", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 active:bg-slate-100"
      >
        <span className="flex items-center gap-1.5">
          {label}
          {count !== undefined && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-500">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
