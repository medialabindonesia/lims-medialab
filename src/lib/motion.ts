import type { Variants, Transition } from "framer-motion";

/**
 * Motion design tokens — satu sumber kebenaran untuk seluruh animasi UI.
 * Tujuannya: animasi yang konsisten, halus, dan terasa "enterprise".
 *
 * Prinsip:
 * - Easing memakai cubic-bezier yang sama (bukan campur-campur per komponen).
 * - Durasi pendek (120–420ms) supaya responsif, bukan lambat.
 * - Entrance halus (fade + sedikit naik), bukan lompatan besar.
 */

/** Easing standar — mendekati "ease-out-quint", terasa premium & decisive. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Easing untuk gerakan dua arah (masuk-keluar). */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Spring lembut untuk interaksi hover/tap (terasa fisik, tidak kaku). */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 26,
  mass: 0.7,
};

/** Container yang men-stagger anak-anaknya saat muncul. */
export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Item yang fade + naik halus. Dipakai bersama staggerContainer. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_OUT },
  },
};

/** Fade + naik standalone (tanpa stagger). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Fade + scale lembut, cocok untuk kartu/badge yang muncul. */
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE_OUT } },
};

/** Transisi halaman: masuk dengan blur kecil, keluar memudar. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.22, ease: EASE_IN_OUT },
  },
};

/** Preset feedback tombol (gabungkan dengan whileHover / whileTap). */
export const buttonHover = { scale: 1.02 } as const;
export const buttonTap = { scale: 0.97 } as const;
