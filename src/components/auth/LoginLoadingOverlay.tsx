"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, FlaskConical, ShieldCheck } from "lucide-react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

const STAGES = [
  "Mengamankan sesi Anda",
  "Menyiapkan izin dan workspace",
  "Membuka dashboard",
] as const;

const SONAR_RINGS = [0, 0.58, 1.16];

export default function LoginLoadingOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return <ActiveLoginOverlay />;
}

function ActiveLoginOverlay() {
  const reduce = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, 1450);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="login-loading-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-brand-navy"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(105,203,247,0.2),transparent_26rem),radial-gradient(circle_at_12%_90%,rgba(111,188,29,0.14),transparent_22rem)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"
          aria-hidden="true"
        />

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.48, ease: EASE_OUT, delay: 0.04 }}
          className="relative flex w-full max-w-sm flex-col items-center px-6 text-center"
        >
          <div className="rounded-2xl border border-white/25 bg-white px-4 py-2.5 shadow-2xl shadow-slate-950/20">
            <Image
              src="/images/logo-medialab.png"
              alt="Medialab Indonesia"
              width={190}
              height={58}
              className="h-auto w-[10.5rem]"
            />
          </div>

          <div className="relative mt-10 flex h-32 w-32 items-center justify-center">
            {!reduce &&
              SONAR_RINGS.map((delay) => (
                <motion.span
                  key={delay}
                  className="absolute inset-2 rounded-full border border-brand-sky/55"
                  initial={{ scale: 0.8, opacity: 0.55 }}
                  animate={{ scale: [0.8, 1.75], opacity: [0.55, 0] }}
                  transition={{
                    duration: 2.1,
                    repeat: Infinity,
                    ease: EASE_OUT,
                    delay,
                  }}
                  aria-hidden="true"
                />
              ))}

            <motion.div
              className="absolute inset-1 rounded-full border border-dashed border-white/20"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
              aria-hidden="true"
            />

            <div className="login-ring relative flex h-20 w-20 items-center justify-center rounded-[1.7rem] p-[3px] shadow-[0_18px_55px_rgba(2,17,47,0.45)]">
              <div className="flex h-full w-full items-center justify-center rounded-[1.55rem] bg-brand-navy">
                <motion.div
                  animate={
                    reduce
                      ? undefined
                      : {
                          scale: [1, 1.1, 1],
                          rotate: [0, 2, 0, -2, 0],
                        }
                  }
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: EASE_IN_OUT,
                  }}
                  className="relative text-white"
                >
                  <FlaskConical size={32} strokeWidth={1.8} />
                  <span className="absolute bottom-1 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-b-lg bg-brand-sky" />
                </motion.div>
              </div>
            </div>

            <span className="absolute bottom-4 right-4 grid h-7 w-7 place-items-center rounded-full border-4 border-brand-navy bg-brand-lime text-brand-navy">
              <Check size={12} strokeWidth={3} />
            </span>
          </div>

          <div className="mt-6 h-14">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-sky">
              Secure authentication
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={stageIndex}
                initial={reduce ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -7 }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
                className="mt-2 text-base font-bold text-white"
              >
                {STAGES[stageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-5 h-1.5 w-64 overflow-hidden rounded-full bg-white/12">
            <motion.div
              className="h-full w-2/5 rounded-full bg-gradient-to-r from-brand-lime via-brand-sky to-white"
              animate={reduce ? undefined : { x: ["-120%", "260%"] }}
              transition={{
                duration: 1.35,
                repeat: Infinity,
                ease: EASE_IN_OUT,
              }}
            />
          </div>

          <p className="mt-5 flex items-center gap-2 text-xs font-medium text-white/55">
            <ShieldCheck size={14} className="text-brand-lime" />
            Mohon tunggu, akses Anda sedang disiapkan
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
