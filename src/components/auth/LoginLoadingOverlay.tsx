"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

/**
 * Overlay loading login "super" — dirancang untuk menutupi total waktu
 * autentikasi (bisa 3-5 detik+ karena DB remote punya latensi tinggi, lihat
 * memory db-latency-remote). Tahapan teks berganti agar tunggu terasa ada
 * progres, bukan macet. Tetap aktif melewati redirect: baru unmount saat
 * halaman berikutnya benar-benar mengambil alih (lihat handleLogin di
 * page.tsx — loading TIDAK di-false-kan pada jalur sukses).
 */

const STAGES = [
  "Menghubungkan ke server...",
  "Memverifikasi kredensial...",
  "Menyiapkan ruang kerja Anda...",
];

const SONAR_RINGS = [0, 0.55, 1.1];

export default function LoginLoadingOverlay({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, 1500);

    return () => clearInterval(timer);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="login-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-50/90 backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.05 }}
            className="flex flex-col items-center px-6 text-center"
          >
            {/* Mark: sonar rings + cincin gradient berputar + flask berdenyut */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              {!reduce &&
                SONAR_RINGS.map((delay) => (
                  <motion.span
                    key={delay}
                    className="absolute inset-0 rounded-full border-2 border-emerald-400/50"
                    initial={{ scale: 0.9, opacity: 0.6 }}
                    animate={{ scale: [0.9, 1.9], opacity: [0.55, 0] }}
                    transition={{
                      duration: 1.9,
                      repeat: Infinity,
                      ease: EASE_OUT,
                      delay,
                    }}
                  />
                ))}

              <div className="login-ring flex h-20 w-20 items-center justify-center rounded-full p-[3px] shadow-lg shadow-emerald-500/20">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                  <motion.div
                    animate={
                      reduce ? undefined : { scale: [1, 1.14, 1] }
                    }
                    transition={{
                      duration: 1.3,
                      repeat: Infinity,
                      ease: EASE_IN_OUT,
                    }}
                    className="text-emerald-500"
                  >
                    <FlaskConical size={30} />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Teks tahapan — berganti tiap 1.5s, terasa ada progres nyata */}
            <div className="mt-7 h-5 min-w-[220px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stageIndex}
                  initial={reduce ? undefined : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="text-sm font-bold text-slate-700"
                >
                  {STAGES[stageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Progress bar indeterminate */}
            <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                animate={
                  reduce ? { x: "150%" } : { x: ["-120%", "220%"] }
                }
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        duration: 1.2,
                        repeat: Infinity,
                        ease: EASE_IN_OUT,
                      }
                }
              />
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Koneksi database mungkin butuh beberapa detik lebih lama
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
