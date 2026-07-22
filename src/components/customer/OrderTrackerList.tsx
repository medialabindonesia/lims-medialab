"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, PackageSearch, RefreshCcw } from "lucide-react";
import { staggerContainer } from "@/lib/motion";
import type { OrderSummary } from "@/lib/order-tracking";
import OrderTrackerCard from "./OrderTrackerCard";

export default function OrderTrackerList({
  orders,
}: {
  orders: OrderSummary[];
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">Pesanan Saya</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCcw size={15} />
          )}
          {justRefreshed && !isPending ? "Terbaru" : "Refresh"}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
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
          className="space-y-4"
        >
          {orders.map((order, index) => (
            <OrderTrackerCard key={order.id} order={order} index={index} />
          ))}
        </motion.div>
      )}
    </section>
  );
}
