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
      whileHover={reduce ? undefined : { y: -2, transition: SPRING_SOFT }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,42,73,0.04)] transition-[border-color,box-shadow] hover:border-blue-200 hover:shadow-[0_8px_22px_rgba(15,42,73,0.08)]"
    >
      {children}
    </motion.div>
  );
}
