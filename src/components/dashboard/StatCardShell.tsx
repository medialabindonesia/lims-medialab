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
      className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/35 p-6 shadow-[0_16px_45px_rgba(7,43,107,0.08)] transition-colors after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-gradient-to-r after:from-brand-blue after:via-brand-sky after:to-brand-lime hover:border-blue-200"
    >
      {children}
    </motion.div>
  );
}
