"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, PackageSearch, RefreshCcw, X } from "lucide-react";
import { staggerContainer } from "@/lib/motion";
import type { OrderSummary } from "@/lib/order-tracking";
import OrderTrackerCard from "./OrderTrackerCard";

export default function OrderTrackerList({
  orders,
  activeFilterLabel = null,
  onClearFilter,
}: {
  orders: OrderSummary[];
  activeFilterLabel?: string | null;
  onClearFilter?: () => void;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justRefreshed, setJustRefreshed] = useState(false);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 1500);
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-black text-slate-900 sm:text-xl">
            Pesanan Saya
          </h2>
          {activeFilterLabel && (
            <button
              type="button"
              onClick={onClearFilter}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-200"
            >
              {activeFilterLabel}
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          aria-label="Muat ulang daftar pesanan"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:rounded-2xl sm:px-3.5 sm:text-sm"
        >
          {isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCcw size={15} />
          )}
          {justRefreshed && !isPending ? "Terbaru" : "Refresh"}
        </button>
      </div>

      {orders.length === 0 && activeFilterLabel ? (
        <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-300 bg-white p-8 text-center sm:rounded-3xl sm:p-12">
          <PackageSearch size={32} className="text-slate-300" />
          <p className="mt-3 font-semibold text-slate-600">
            Tidak ada pesanan pada filter ini
          </p>
          <button
            type="button"
            onClick={onClearFilter}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Tampilkan semua pesanan
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-slate-300 bg-white p-8 text-center sm:rounded-3xl sm:p-12">
          <PackageSearch size={32} className="text-slate-300" />
          <p className="mt-3 font-semibold text-slate-600">
            Belum ada pesanan
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Ajukan permintaan quotation untuk mulai memesan jasa analisis
            laboratorium.
          </p>
          <a
            href="/quotations/request"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Request Quotation
          </a>
        </div>
      ) : (
        <motion.div
          variants={reduce ? undefined : staggerContainer(0.08)}
          initial={reduce ? undefined : "hidden"}
          animate="visible"
          className="space-y-3 sm:space-y-4"
        >
          {orders.map((order, index) => (
            <OrderTrackerCard key={order.id} order={order} index={index} />
          ))}
        </motion.div>
      )}
    </section>
  );
}
