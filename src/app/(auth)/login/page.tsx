"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Login gagal");
      return;
    }

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
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-120px] top-[-120px] h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            <Sparkles size={16} />
            Laboratory Information Management System
          </div>

          <h1 className="max-w-4xl text-6xl font-black leading-tight tracking-tight">
            LIMS-Medialab
            <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              Digital Laboratory Workflow
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Kelola quotation, sample, analisis laboratorium, COA, dan invoice
            dalam satu sistem workflow yang terstruktur dengan RBAC fleksibel.
          </p>

          <div className="mt-10 grid max-w-3xl gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                <FlaskConical size={24} />
              </div>
              <h3 className="font-bold">Lab Flow</h3>
              <p className="mt-2 text-sm text-slate-400">
                Receive sample, distribute parameter, input result, validate.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 inline-flex rounded-2xl bg-cyan-400/15 p-3 text-cyan-300">
                <BadgeCheck size={24} />
              </div>
              <h3 className="font-bold">COA Template</h3>
              <p className="mt-2 text-sm text-slate-400">
                Air Ambient, Heat Stress, dan template COA fleksibel.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 inline-flex rounded-2xl bg-indigo-400/15 p-3 text-indigo-300">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-bold">RBAC</h3>
              <p className="mt-2 text-sm text-slate-400">
                Hak akses menu dan aksi bisa diatur per role.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
              <FlaskConical size={28} />
            </div>
            <h1 className="text-3xl font-black">LIMS-Medialab</h1>
            <p className="mt-2 text-sm text-slate-400">
              Digital Laboratory Workflow
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                <KeyRound size={24} />
              </div>
              <h2 className="text-3xl font-black">Welcome Back</h2>
              <p className="mt-2 text-sm text-slate-400">
                Masuk untuk mengakses dashboard LIMS-Medialab.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
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
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-3 pl-11 pr-4 text-white outline-none transition focus:border-emerald-400"
                    placeholder="email@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
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
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-3 pl-11 pr-4 text-white outline-none transition focus:border-emerald-400"
                    placeholder="password"
                  />
                </div>
              </div>

              {message && (
                <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {message}
                </p>
              )}

              <button
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Demo Account
              </p>

              <div className="grid gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    className="flex items-center justify-between rounded-2xl border border-white/10 px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <span>{account.role}</span>
                    <span className="text-slate-500">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © 2026 LIMS-Medialab. Laboratory workflow system.
          </p>
        </section>
      </div>
    </main>
  );
}