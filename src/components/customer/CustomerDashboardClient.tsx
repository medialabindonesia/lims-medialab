"use client";

import { useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  FileBadge,
  FilePlus,
  PackageCheck,
  Receipt,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { fadeUpItem, staggerContainer } from "@/lib/motion";
import type { OrderSummary } from "@/lib/order-tracking";
import OrderTrackerList from "./OrderTrackerList";

type FilterKey = "quotation" | "sample" | "coa" | "invoice";

type StatConfig = {
  key: FilterKey;
  title: string;
  value: number;
  icon: ElementType;
  help: string;
  match: (o: OrderSummary) => boolean;
};

type Counts = {
  quotations: number;
  samples: number;
  preliminaryCoa: number;
  invoices: number;
};

const FILTER_LABEL: Record<FilterKey, string> = {
  quotation: "Tahap penawaran",
  sample: "Ada sample",
  coa: "COA terbit",
  invoice: "Ada invoice",
};

export default function CustomerDashboardClient({
  orders,
  counts,
}: {
  orders: OrderSummary[];
  counts: Counts;
}) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<FilterKey | null>(null);

  const stats: StatConfig[] = [
    {
      key: "quotation",
      title: "Quotation",
      value: counts.quotations,
      icon: FilePlus,
      help: "Masih tahap penawaran",
      match: (o) => o.stage <= 1,
    },
    {
      key: "sample",
      title: "Sample",
      value: counts.samples,
      icon: PackageCheck,
      help: "Sudah ada sample",
      match: (o) => o.sampleId !== null,
    },
    {
      key: "coa",
      title: "Preliminary COA",
      value: counts.preliminaryCoa,
      icon: FileBadge,
      help: "COA sudah terbit",
      match: (o) => o.stage >= 4,
    },
    {
      key: "invoice",
      title: "Invoice",
      value: counts.invoices,
      icon: Receipt,
      help: "Sudah ada tagihan",
      match: (o) => o.invoiceStatus !== null,
    },
  ];

  const activeStat = stats.find((s) => s.key === filter) ?? null;
  const filteredOrders = useMemo(
    () => (activeStat ? orders.filter(activeStat.match) : orders),
    [orders, activeStat]
  );

  // Pesanan yang butuh tindakan customer, prioritas tertinggi dulu.
  const actionable = useMemo(() => {
    const needConfirm = orders.find((o) => o.stage === 4);
    if (needConfirm)
      return {
        order: needConfirm,
        reason: "Preliminary COA menunggu konfirmasi Anda",
        cta: { label: "Lihat & Konfirmasi", href: "/coa/preliminary" },
      };
    const needPay = orders.find((o) => o.invoiceStatus === "SENT");
    if (needPay)
      return {
        order: needPay,
        reason: "Invoice sudah terkirim dan menunggu pembayaran",
        cta: { label: "Bayar Invoice", href: "/customer/invoices" },
      };
    const retest = orders.find((o) => o.retestBanner);
    if (retest)
      return {
        order: retest,
        reason: "Hasil sedang ditinjau ulang oleh tim lab",
        cta: {
          label: "Lihat Detail",
          href: `/customer/orders/${retest.id}`,
        },
      };
    return null;
  }, [orders]);

  const doneCount = orders.filter((o) => o.stage >= 5).length;
  const activeCount = orders.length - doneCount;

  function toggle(key: FilterKey) {
    setFilter((prev) => (prev === key ? null : key));
  }

  return (
    <div>
      {/* Spotlight */}
      {actionable ? (
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 overflow-hidden rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-sm sm:p-7"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                <BellRing size={13} />
                Perlu Aksi Anda
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight">
                {actionable.order.quotationNo}
              </h2>
              <p className="mt-1 text-sm text-emerald-50">
                {actionable.reason}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Link
                href={actionable.cta.href}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                {actionable.cta.label}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`/customer/orders/${actionable.order.id}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:text-white"
              >
                Lihat detail pesanan
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Sparkles size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Semua pesanan terkendali
              </h2>
              <p className="text-sm text-slate-500">
                Tidak ada yang butuh tindakan Anda saat ini.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-2.5 text-center">
              <p className="text-xl font-black text-slate-900">{activeCount}</p>
              <p className="text-xs text-slate-400">Berlangsung</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-center">
              <p className="text-xl font-black text-emerald-700">{doneCount}</p>
              <p className="text-xs text-emerald-600">Selesai</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Interactive stat cards */}
      <motion.div
        variants={reduce ? undefined : staggerContainer(0.06)}
        initial={reduce ? undefined : "hidden"}
        animate="visible"
        className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          const active = filter === stat.key;
          return (
            <motion.button
              key={stat.key}
              type="button"
              variants={reduce ? undefined : fadeUpItem}
              onClick={() => toggle(stat.key)}
              aria-pressed={active}
              whileHover={reduce ? undefined : { y: -3 }}
              className={`group rounded-3xl border p-5 text-left transition-colors ${
                active
                  ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-emerald-200"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${
                    active
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  <Icon size={20} />
                </span>
                {active && (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                )}
              </div>
              <p className="text-sm text-slate-400">{stat.title}</p>
              <p className="mt-1 text-3xl font-black text-slate-900">
                {stat.value}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-400">
                {active ? (
                  <>Klik untuk lihat semua</>
                ) : (
                  <>
                    <RefreshCcw size={11} className="opacity-0 group-hover:opacity-100" />
                    {stat.help}
                  </>
                )}
              </p>
            </motion.button>
          );
        })}
      </motion.div>

      <OrderTrackerList
        orders={filteredOrders}
        activeFilterLabel={activeStat ? FILTER_LABEL[activeStat.key] : null}
        onClearFilter={() => setFilter(null)}
      />
    </div>
  );
}
