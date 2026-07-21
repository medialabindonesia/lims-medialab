"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { staggerContainer, fadeUpItem, EASE_OUT } from "@/lib/motion";
import LoginLoadingOverlay from "@/components/auth/LoginLoadingOverlay";
import {
  ArrowRight,
  BadgeCheck,
  FlaskConical,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [email, setEmail] = useState("admin@lims-medialab.test");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setLoading(false);
      setMessage(data.message || "Login gagal");
      return;
    }

    // Sengaja TIDAK setLoading(false) di sini: overlay tetap menutupi layar
    // selama redirect + halaman dashboard mengambil alih (baru unmount saat
    // route baru benar-benar swap-in), jadi seluruh waktu tunggu tertutup
    // animasi, bukan cuma durasi fetch.
    router.push(data.redirectTo || "/dashboard");
    router.refresh();
  }

  const demoAccounts = [
    {
      role: "Super Admin",
      email: "admin@lims-medialab.test",
      password: "admin123",
    },
    {
      role: "Customer",
      email: "customer@medialab.test",
      password: "customer123",
    },
    {
      role: "Sales",
      email: "sales@medialab.test",
      password: "password123",
    },
    {
      role: "Lab Analyst",
      email: "analyst@medialab.test",
      password: "password123",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <LoginLoadingOverlay active={loading} />
      <div className="pointer-events-none fixed inset-0">
        <motion.div
          className="absolute left-[-120px] top-[-120px] h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl"
          animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-sky-200/50 blur-3xl"
          animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-100 blur-3xl"
          animate={reduce ? undefined : { scale: [1, 1.1, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.section
          className="hidden lg:block"
          variants={staggerContainer(0.1)}
          initial={reduce ? false : "hidden"}
          animate="visible"
        >
          <motion.div
            variants={fadeUpItem}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-600"
          >
            <Sparkles size={16} />
            Laboratory Information Management System
          </motion.div>

          <motion.h1
            variants={fadeUpItem}
            className="max-w-4xl text-6xl font-black leading-tight tracking-tight"
          >
            LIMS-Medialab
            <span className="block bg-gradient-to-r from-emerald-500 via-sky-400 to-blue-500 bg-clip-text text-transparent">
              Digital Laboratory Workflow
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUpItem}
            className="mt-6 max-w-2xl text-lg leading-8 text-slate-600"
          >
            Kelola quotation, sample, analisis laboratorium, COA, dan invoice
            dalam satu sistem workflow yang terstruktur dengan RBAC fleksibel.
          </motion.p>

          <motion.div
            variants={staggerContainer(0.08)}
            className="mt-10 grid max-w-3xl gap-4 md:grid-cols-3"
          >
            <motion.div
              variants={fadeUpItem}
              whileHover={reduce ? undefined : { y: -4 }}
              className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur transition-colors hover:border-emerald-200"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                <FlaskConical size={24} />
              </div>
              <h3 className="font-bold">Lab Flow</h3>
              <p className="mt-2 text-sm text-slate-400">
                Receive sample, distribute parameter, input result, validate.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUpItem}
              whileHover={reduce ? undefined : { y: -4 }}
              className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur transition-colors hover:border-sky-200"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-600">
                <BadgeCheck size={24} />
              </div>
              <h3 className="font-bold">COA Template</h3>
              <p className="mt-2 text-sm text-slate-400">
                Air Ambient, Heat Stress, dan template COA fleksibel.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUpItem}
              whileHover={reduce ? undefined : { y: -4 }}
              className="rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur transition-colors hover:border-sky-200"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-600">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-bold">RBAC</h3>
              <p className="mt-2 text-sm text-slate-400">
                Hak akses menu dan aksi bisa diatur per role.
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-md"
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 }}
        >
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <FlaskConical size={28} />
            </div>
            <h1 className="text-3xl font-black">LIMS-Medialab</h1>
            <p className="mt-2 text-sm text-slate-400">
              Digital Laboratory Workflow
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-100 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                <KeyRound size={24} />
              </div>
              <h2 className="text-3xl font-black">Welcome Back</h2>
              <p className="mt-2 text-sm text-slate-400">
                Masuk untuk mengakses dashboard LIMS-Medialab.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-emerald-500 disabled:opacity-60"
                    placeholder="email@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-emerald-500 disabled:opacity-60"
                    placeholder="password"
                  />
                </div>
              </div>

              {message && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </p>
              )}

              <motion.button
                disabled={loading}
                whileHover={reduce || loading ? undefined : { scale: 1.02 }}
                whileTap={reduce || loading ? undefined : { scale: 0.97 }}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </motion.button>
            </form>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Demo Account
              </p>

              <div className="grid gap-2">
                {demoAccounts.map((account) => (
                  <motion.button
                    key={account.email}
                    type="button"
                    disabled={loading}
                    whileTap={reduce || loading ? undefined : { scale: 0.98 }}
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-emerald-200 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>{account.role}</span>
                    <span className="text-slate-500">{account.email}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © 2026 LIMS-Medialab. Laboratory workflow system.
          </p>
        </motion.section>
      </div>
    </main>
  );
}