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
  className = "mb-5",
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
      <div className="border-b border-slate-200 pb-5">
        <div>
          {eyebrow && (
            <motion.p
              className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-700"
              {...item(0)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-lime" />
              {eyebrow}
            </motion.p>
          )}
          <motion.h1
            className="mt-1.5 max-w-4xl text-[1.45rem] font-black leading-[1.15] tracking-[-0.025em] text-slate-900 sm:text-[1.75rem]"
            {...item(0.06)}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              className="mt-1.5 max-w-3xl text-[13px] leading-5 text-slate-500 sm:text-sm"
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
