"use client";

import { useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  FileBadge,
  FilePlus,
  PackageCheck,
  Receipt,
  Sparkles,
} from "lucide-react";
import { staggerContainer } from "@/lib/motion";
import {
  formatShortDate,
  humanOrderTitle,
  parseDocumentNumber,
} from "@/lib/customer-labels";
import type { OrderSummary } from "@/lib/order-tracking";
import StatTile from "@/components/ui/StatTile";
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
  coa: "Hasil terbit",
  invoice: "Ada tagihan",
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
      title: "Hasil Uji",
      value: counts.preliminaryCoa,
      icon: FileBadge,
      help: "Hasil sudah terbit",
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
          className="mb-4 overflow-hidden rounded-[1.25rem] border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm sm:mb-6 sm:rounded-[1.75rem] sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold sm:text-xs">
                <BellRing size={12} />
                Perlu Aksi Anda
              </div>
              <h2 className="mt-2.5 text-lg font-black leading-snug tracking-tight sm:text-2xl">
                {humanOrderTitle(actionable.order.templateName)}
              </h2>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/90">
                {parseDocumentNumber(actionable.order.quotationNo).short}
                {formatShortDate(actionable.order.updatedAt)
                  ? ` · ${formatShortDate(actionable.order.updatedAt)}`
                  : ""}
              </p>
              <p className="mt-2 text-[13px] leading-5 text-emerald-50 sm:text-sm">
                {actionable.reason}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Link
                href={actionable.cta.href}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                {actionable.cta.label}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`/customer/orders/${actionable.order.id}`}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:text-white"
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
          className="mb-4 flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:mb-6 sm:rounded-[1.75rem] sm:p-6"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 sm:h-12 sm:w-12 sm:rounded-2xl">
            <Sparkles size={20} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-black leading-tight text-slate-900 sm:text-lg">
              Semua pesanan terkendali
            </h2>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500 sm:text-sm">
              Tidak ada yang butuh tindakan Anda saat ini.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-lg font-black leading-none text-slate-900">
                {activeCount}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                Berjalan
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-lg font-black leading-none text-emerald-700">
                {doneCount}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                Selesai
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Interactive stat cards */}
      <motion.div
        variants={reduce ? undefined : staggerContainer(0.06)}
        initial={reduce ? undefined : "hidden"}
        animate="visible"
        className="mb-5 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatTile
            key={stat.key}
            title={stat.title}
            value={stat.value}
            help={stat.help}
            icon={stat.icon}
            active={filter === stat.key}
            onClick={() => toggle(stat.key)}
          />
        ))}
      </motion.div>

      <OrderTrackerList
        orders={filteredOrders}
        activeFilterLabel={activeStat ? FILTER_LABEL[activeStat.key] : null}
        onClearFilter={() => setFilter(null)}
      />
    </div>
  );
}
