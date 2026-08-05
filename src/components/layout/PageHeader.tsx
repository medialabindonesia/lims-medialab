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
    <div className={cn("mb-5 sm:mb-6", className)}>
      <div className="relative overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white px-4 py-4 shadow-[0_12px_34px_rgba(7,43,107,0.07)] sm:rounded-[1.75rem] sm:px-6 sm:py-6">
        <div
          className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-brand-sky/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-sky via-brand-blue to-brand-lime sm:w-1.5"
          aria-hidden="true"
        />

        <div className="relative">
          {eyebrow && (
            <motion.p
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700 sm:text-[11px] sm:tracking-[0.15em]"
              {...item(0)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-lime" />
              {eyebrow}
            </motion.p>
          )}

          <motion.h1
            className="mt-2 max-w-4xl text-[1.375rem] font-black leading-[1.15] tracking-[-0.025em] text-slate-900 sm:mt-3 sm:text-3xl sm:leading-[1.1] lg:text-4xl"
            {...item(0.05)}
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              className="mt-2 max-w-3xl text-[13px] leading-5 text-slate-500 sm:mt-3 sm:text-sm sm:leading-6"
              {...item(0.1)}
            >
              {subtitle}
            </motion.p>
          )}

          {actions && (
            <motion.div
              className="mt-4 flex flex-wrap items-center gap-2"
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
