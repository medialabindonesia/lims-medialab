"use client";

import { motion, useReducedMotion } from "framer-motion";

type MotionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
};

/**
 * Header halaman yang muncul dengan animasi berlapis (eyebrow → judul →
 * subtitle). Dipakai konsisten di seluruh halaman dashboard.
 */
export default function MotionHeader({
  eyebrow,
  title,
  subtitle,
  className = "mb-8",
}: MotionHeaderProps) {
  const reduce = useReducedMotion();

  const ease = [0.22, 1, 0.36, 1] as const;
  const item = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease },
        };

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(7,43,107,0.08)] sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-brand-sky/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-sky via-brand-blue to-brand-lime"
          aria-hidden="true"
        />

        <div className="relative">
          {eyebrow && (
            <motion.p
              className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-blue-700"
              {...item(0)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-lime" />
              {eyebrow}
            </motion.p>
          )}
          <motion.h1
            className="mt-3 max-w-4xl text-[clamp(2rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.035em] text-slate-900"
            {...item(0.06)}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7"
              {...item(0.12)}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
