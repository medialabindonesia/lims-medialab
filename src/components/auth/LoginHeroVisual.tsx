"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Atom,
  Beaker,
  Dna,
  FlaskConical,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

const PARTICLES = [
  { left: "8%", top: "21%", delay: 0.2, duration: 7.4 },
  { left: "17%", top: "72%", delay: 1.7, duration: 8.2 },
  { left: "30%", top: "12%", delay: 3.1, duration: 6.8 },
  { left: "67%", top: "10%", delay: 1.1, duration: 7.9 },
  { left: "79%", top: "68%", delay: 2.6, duration: 7.1 },
  { left: "91%", top: "28%", delay: 4.2, duration: 8.5 },
];

function OrbitNode({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10 text-brand-sky shadow-[0_12px_36px_rgba(2,17,47,0.28)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export default function LoginHeroVisual() {
  const reduce = useReducedMotion();

  return (
    <div
      className="relative mx-auto h-[23rem] w-full max-w-[38rem]"
      aria-hidden="true"
    >
      <div className="login-beam" />

      {PARTICLES.map((particle, index) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className="login-particle"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            width: index % 2 ? "3px" : "4px",
            height: index % 2 ? "3px" : "4px",
          }}
        />
      ))}

      <motion.div
        className="login-orbit left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        <OrbitNode className="-right-5 top-1/2 -translate-y-1/2">
          <Dna size={18} />
        </OrbitNode>
        <OrbitNode className="bottom-5 left-3">
          <Activity size={18} />
        </OrbitNode>
      </motion.div>

      <motion.div
        className="login-orbit left-1/2 top-1/2 h-[14rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 border-brand-lime/30"
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      >
        <OrbitNode className="-left-5 top-1/2 -translate-y-1/2 text-brand-lime">
          <Beaker size={18} />
        </OrbitNode>
        <OrbitNode className="right-1 top-1 text-brand-lime">
          <Atom size={18} />
        </OrbitNode>
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={reduce ? false : { opacity: 0, scale: 0.75, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.9, delay: 0.22, ease: EASE_OUT }}
      >
        <motion.div
          className="login-core"
          animate={
            reduce
              ? undefined
              : {
                  y: [0, -8, 0],
                  rotate: [0, 1.5, 0, -1.5, 0],
                }
          }
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: EASE_IN_OUT,
          }}
        >
          <FlaskConical
            size={54}
            strokeWidth={1.55}
            className="text-white drop-shadow-[0_0_18px_rgba(105,203,247,0.55)]"
          />
          <motion.span
            className="absolute bottom-[2.7rem] left-1/2 h-3 w-9 -translate-x-1/2 rounded-b-xl bg-brand-sky/80 blur-[1px]"
            animate={
              reduce
                ? undefined
                : {
                    scaleX: [0.8, 1.08, 0.8],
                    opacity: [0.7, 1, 0.7],
                  }
            }
            transition={{ duration: 2.6, repeat: Infinity, ease: EASE_IN_OUT }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute left-1 top-6 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-md"
        initial={reduce ? false : { opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.65, ease: EASE_OUT }}
      >
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-sky">
          <ScanLine size={14} />
          Live workflow
        </div>
        <div className="mt-2 flex items-end gap-1">
          {[36, 58, 44, 76, 55, 88, 67, 100, 78].map((height, index) => (
            <motion.span
              key={`${height}-${index}`}
              className="w-1 rounded-full bg-gradient-to-t from-brand-blue to-brand-sky"
              style={{ height: `${Math.max(8, height / 4)}px` }}
              animate={
                reduce
                  ? undefined
                  : { scaleY: [0.55, 1, 0.7, 1, 0.55] }
              }
              transition={{
                duration: 2.2,
                delay: index * 0.08,
                repeat: Infinity,
                ease: EASE_IN_OUT,
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-6 right-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-md"
        initial={reduce ? false : { opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.78, ease: EASE_OUT }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-lime text-brand-navy">
            <ShieldCheck size={17} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
              Data integrity
            </p>
            <p className="mt-0.5 text-xs font-bold text-white">
              Access protected
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
