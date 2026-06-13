"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion";

/**
 * Pembungkus animasi untuk StatCard. Hanya menerima `children` (elemen React)
 * dan `index` (number), sehingga aman dilewatkan dari Server Component — tidak
 * ada prop berupa function/komponen yang menyeberang batas server→client.
 * `index` dipakai untuk delay bertingkat (efek stagger antar kartu).
 */
export default function StatCardShell({
  children,
  index = 0,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE_OUT, delay: index * 0.07 }}
      whileHover={reduce ? undefined : { y: -6, transition: SPRING_SOFT }}
      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 transition-colors hover:border-emerald-200 hover:bg-slate-50"
    >
      {children}
    </motion.div>
  );
}
