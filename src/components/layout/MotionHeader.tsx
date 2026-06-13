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
      {eyebrow && (
        <motion.p
          className="text-sm font-medium text-emerald-600"
          {...item(0)}
        >
          {eyebrow}
        </motion.p>
      )}
      <motion.h1 className="mt-2 text-4xl font-bold" {...item(0.06)}>
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p className="mt-3 max-w-2xl text-slate-400" {...item(0.12)}>
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
