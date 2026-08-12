"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Baris tombol aksi (mis. "Buat Quotation", "Refresh"). */
  actions?: ReactNode;
  /** Slot bebas di bawah aksi — biasanya kolom pencarian. */
  children?: ReactNode;
  className?: string;
};

/**
 * Header halaman tunggal: eyebrow → judul → subtitle → aksi → slot bebas.
 *
 * Menggantikan pola lama "header besar + kartu intro yang mengulang judul
 * yang sama". Satu blok saja supaya di layar mobile tidak ada ±250px ruang
 * yang terbuang untuk teks kembar.
 *
 * Skala tipografi sengaja dijaga proporsional di mobile (judul ~22px, bukan
 * 32px seperti clamp lama yang tidak pernah mengecil di lebar 390px).
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className,
}: PageHeaderProps) {
  const reduce = useReducedMotion();

  const item = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: EASE_OUT },
        };

  return (
    <div className={cn("mb-5", className)}>
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          {eyebrow && (
            <motion.p
              className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-700"
              {...item(0)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-lime" />
              {eyebrow}
            </motion.p>
          )}

          <motion.h1
            className="mt-1.5 max-w-4xl text-[1.45rem] font-black leading-[1.15] tracking-[-0.025em] text-slate-900 sm:text-[1.75rem]"
            {...item(0.05)}
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              className="mt-1.5 max-w-3xl text-[13px] leading-5 text-slate-500 sm:text-sm"
              {...item(0.1)}
            >
              {subtitle}
            </motion.p>
          )}

          {actions && (
            <motion.div
              className="mt-3 flex flex-wrap items-center gap-2"
              {...item(0.14)}
            >
              {actions}
            </motion.div>
          )}

          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
