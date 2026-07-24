"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Eye,
  EyeOff,
  Fingerprint,
  FlaskConical,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { EASE_OUT, fadeUpItem, staggerContainer } from "@/lib/motion";
import LoginHeroVisual from "@/components/auth/LoginHeroVisual";
import LoginLoadingOverlay from "@/components/auth/LoginLoadingOverlay";

const DEMO_ACCOUNTS = [
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
] as const;

const IS_DEMO_MODE = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState(
    IS_DEMO_MODE ? DEMO_ACCOUNTS[0].email : "",
  );
  const [password, setPassword] = useState(
    IS_DEMO_MODE ? DEMO_ACCOUNTS[0].password : "",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
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

      const isJson = response.headers
        .get("content-type")
        ?.includes("application/json");
      const data = isJson
        ? ((await response.json()) as {
            message?: string;
            redirectTo?: string;
          })
        : {};

      if (!response.ok) {
        setLoading(false);
        setMessage(
          data.message ||
            "Kami belum dapat memverifikasi akun tersebut. Silakan periksa kembali.",
        );
        return;
      }

      /*
       * Keep the overlay active while the destination dashboard resolves.
       * It unmounts naturally when the route swaps, avoiding a blank waiting
       * state between authentication and the first dashboard render.
       */
      router.replace(data.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setMessage(
        "Koneksi ke layanan autentikasi terputus. Periksa jaringan lalu coba lagi.",
      );
    }
  }

  function selectDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setMessage("");
  }

  return (
    <main className="login-stage" aria-busy={loading}>
      <LoginLoadingOverlay active={loading} />

      <div className="grid min-h-[100svh] lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
        <section className="login-hero hidden min-h-[100svh] lg:flex lg:flex-col">
          <div className="login-vignette" />

          <div className="relative z-10 flex h-full min-h-[100svh] flex-col px-10 py-8 xl:px-16 xl:py-10">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className="flex items-center justify-between gap-6"
            >
              <div className="rounded-2xl border border-white/25 bg-white px-4 py-2.5 shadow-2xl shadow-slate-950/15">
                <Image
                  src="/images/logo-medialab.png"
                  alt="Medialab Indonesia"
                  width={210}
                  height={64}
                  priority
                  className="h-auto w-[11.5rem] xl:w-[13rem]"
                />
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-lime opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-lime" />
                </span>
                System ready
              </div>
            </motion.div>

            <motion.div
              variants={staggerContainer(0.09, 0.12)}
              initial={reduce ? false : "hidden"}
              animate="visible"
              className="mt-9 xl:mt-12"
            >
              <motion.div
                variants={fadeUpItem}
                className="inline-flex items-center gap-2 rounded-full border border-brand-sky/25 bg-brand-sky/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-sky"
              >
                <Sparkles size={14} />
                Laboratory intelligence
              </motion.div>

              <motion.h1
                variants={fadeUpItem}
                className="mt-5 max-w-[42rem] text-[clamp(2.65rem,4vw,4.7rem)] font-black leading-[0.98] tracking-[-0.045em] text-white"
              >
                Kendali laboratorium,
                <span className="mt-2 block bg-gradient-to-r from-brand-sky via-white to-brand-lime bg-clip-text text-transparent">
                  dalam satu alur presisi.
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUpItem}
                className="mt-5 max-w-[38rem] text-base leading-7 text-white/72 xl:text-lg xl:leading-8"
              >
                Dari quotation hingga certificate of analysis, setiap tahap
                terhubung, terlacak, dan siap diaudit dalam satu workspace.
              </motion.p>
            </motion.div>

            <div className="relative flex min-h-[18rem] flex-1 items-center">
              <LoginHeroVisual />
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.9, ease: EASE_OUT }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                {
                  icon: FlaskConical,
                  label: "End-to-end",
                  value: "Lab workflow",
                },
                {
                  icon: BadgeCheck,
                  label: "Traceable",
                  value: "Quality control",
                },
                {
                  icon: ShieldCheck,
                  label: "Role-based",
                  value: "Secure access",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/12 bg-white/[0.07] p-3.5 backdrop-blur-sm"
                >
                  <Icon size={18} className="text-brand-lime" />
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-white">{value}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="relative flex min-h-[100svh] items-center overflow-x-hidden px-4 py-8 sm:px-8 lg:px-10 xl:px-16">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-sky/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-brand-lime/12 blur-3xl"
            aria-hidden="true"
          />

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.62, delay: 0.12, ease: EASE_OUT }}
            className="relative z-10 mx-auto w-full max-w-[31rem]"
          >
            <div className="mb-7 text-center lg:hidden">
              <div className="mx-auto inline-flex rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-lg shadow-blue-900/5">
                <Image
                  src="/images/logo-medialab.png"
                  alt="Medialab Indonesia"
                  width={220}
                  height={66}
                  priority
                  className="h-auto w-[12rem] sm:w-[13.5rem]"
                />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Laboratory Information Management System
              </p>
            </div>

            <div className="login-card rounded-[2rem] p-5 sm:p-7 xl:p-8">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700">
                      <Fingerprint size={14} />
                      Secure access
                    </div>
                    <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-900 sm:text-[2.1rem]">
                      Selamat datang kembali
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Masuk dengan akun terdaftar untuk melanjutkan pekerjaan
                      laboratorium Anda.
                    </p>
                  </div>

                  <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-800 to-blue-500 text-white shadow-lg shadow-blue-900/20 sm:grid">
                    <KeyRound size={22} />
                  </div>
                </div>

                <form
                  onSubmit={handleLogin}
                  className="mt-7 space-y-5"
                  aria-describedby={message ? "login-error" : undefined}
                >
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Alamat email
                    </label>
                    <div className="login-input relative rounded-2xl border border-slate-200 bg-slate-50">
                      <Mail
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                        aria-hidden="true"
                      />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={loading}
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        aria-invalid={Boolean(message)}
                        className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="nama@perusahaan.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Kata sandi
                    </label>
                    <div className="login-input relative rounded-2xl border border-slate-200 bg-slate-50">
                      <LockKeyhole
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                        aria-hidden="true"
                      />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                        required
                        autoComplete="current-password"
                        aria-invalid={Boolean(message)}
                        className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Masukkan kata sandi"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={loading}
                        aria-label={
                          showPassword
                            ? "Sembunyikan kata sandi"
                            : "Tampilkan kata sandi"
                        }
                        aria-pressed={showPassword}
                        className="absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff size={17} aria-hidden="true" />
                        ) : (
                          <Eye size={17} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {message && (
                    <motion.div
                      id="login-error"
                      role="alert"
                      initial={reduce ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
                    >
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <span>{message}</span>
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={
                      reduce || loading ? undefined : { y: -2, scale: 1.008 }
                    }
                    whileTap={
                      reduce || loading ? undefined : { scale: 0.985 }
                    }
                    className="group relative inline-flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-navy via-brand-deep to-brand-blue px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(7,43,107,0.22)] transition-shadow hover:shadow-[0_18px_42px_rgba(7,43,107,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[430%] motion-reduce:hidden" />
                    <span className="relative">
                      {loading ? "Memverifikasi..." : "Masuk ke workspace"}
                    </span>
                    <span className="relative grid h-6 w-6 place-items-center rounded-full bg-brand-lime text-brand-navy">
                      <ArrowRight
                        size={14}
                        strokeWidth={2.8}
                        className="transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </motion.button>
                </form>

                <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck
                    size={15}
                    className="text-emerald-600"
                    aria-hidden="true"
                  />
                  Sesi terenkripsi dan dilindungi akses berbasis peran
                </div>

                {IS_DEMO_MODE && (
                  <details className="group mt-6 border-t border-slate-200 pt-5">
                    <summary className="flex list-none items-center justify-between rounded-xl px-1 py-1 text-xs font-extrabold uppercase tracking-[0.13em] text-blue-700 outline-none marker:content-none">
                      <span>Gunakan akun demo</span>
                      <ChevronDown
                        size={16}
                        className="transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>

                    <div className="mt-3 grid gap-2">
                      {DEMO_ACCOUNTS.map((account) => (
                        <button
                          key={account.email}
                          type="button"
                          disabled={loading}
                          onClick={() => selectDemoAccount(account)}
                          className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="shrink-0 text-xs font-bold text-slate-800">
                            {account.role}
                          </span>
                          <span className="min-w-0 truncate text-[11px] font-medium text-slate-500">
                            {account.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <p className="mt-6 text-center text-xs font-medium text-slate-500">
              &copy; 2026 Medialab Indonesia
              <span className="mx-2 text-slate-300" aria-hidden="true">
                •
              </span>
              LIMS Workspace
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
