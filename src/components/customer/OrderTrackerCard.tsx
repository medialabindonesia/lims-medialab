"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  CheckCheck,
  Check,
  Clock,
  FileBadge,
  FileCheck,
  FilePlus,
  Microscope,
  PackageCheck,
  Receipt,
  RefreshCcw,
  Zap,
} from "lucide-react";
import { fadeUpItem, staggerContainer } from "@/lib/motion";
import type { OrderSummary, OrderStage } from "@/lib/order-tracking";

const iconMap: Record<string, ElementType> = {
  FilePlus,
  FileCheck,
  PackageCheck,
  Microscope,
  FileBadge,
  Award,
  CheckCheck,
};

const STAGES: OrderStage[] = [0, 1, 2, 3, 4, 5, 6];

const STAGE_LABELS: Record<OrderStage, string> = {
  0: "Menunggu Persetujuan",
  1: "Disetujui",
  2: "Sample Diterima",
  3: "Dianalisis",
  4: "Konfirmasi Anda",
  5: "Sertifikat Terbit",
  6: "Selesai",
};

const STAGE_ICONS: Record<OrderStage, string> = {
  0: "FilePlus",
  1: "FileCheck",
  2: "PackageCheck",
  3: "Microscope",
  4: "FileBadge",
  5: "Award",
  6: "CheckCheck",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function invoiceStatusLabel(status: string | null) {
  switch (status) {
    case "DRAFT":
      return "Invoice sedang disiapkan";
    case "WAITING_APPROVAL":
      return "Invoice menunggu approval internal";
    case "APPROVED":
      return "Invoice disetujui, segera dikirim";
    case "SENT":
      return "Invoice terkirim, menunggu pembayaran Anda";
    case "PAYMENT_SUBMITTED":
      return "Bukti pembayaran sedang diverifikasi";
    case "PAID":
      return "Invoice lunas";
    default:
      return "Menunggu invoice diterbitkan";
  }
}

export default function OrderTrackerCard({
  order,
  index,
}: {
  order: OrderSummary;
  index: number;
}) {
  const reduce = useReducedMotion();
  const isUrgent =
    order.tatRequested === "URGENT" || order.tatRequested === "TOP_URGENT";

  return (
    <motion.div
      variants={reduce ? undefined : fadeUpItem}
      custom={index}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-emerald-200"
    >
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">
              {order.quotationNo}
            </h3>
            {isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                <Zap size={11} />
                {order.tatRequested === "TOP_URGENT" ? "Top Urgent" : "Urgent"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {order.templateName || "Template belum ditentukan"}
          </p>
        </div>

        {order.estimatedCoaDate && (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
            <Clock size={14} className="text-slate-400" />
            <span className="text-slate-500">Estimasi selesai</span>
            <span className="font-bold text-slate-800">
              {formatDate(order.estimatedCoaDate)}
            </span>
          </div>
        )}
      </div>

      {/* Stepper */}
      <motion.div
        variants={reduce ? undefined : staggerContainer(0.05)}
        initial={reduce ? undefined : "hidden"}
        animate="visible"
        className="flex items-start gap-1 overflow-x-auto pb-1 sm:gap-1.5"
      >
        {STAGES.map((stage, i) => {
          const Icon = iconMap[STAGE_ICONS[stage]];
          const completed = stage < order.stage;
          const current = stage === order.stage;

          return (
            <motion.div
              key={stage}
              variants={reduce ? undefined : fadeUpItem}
              className="flex items-start"
            >
              <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-20">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    completed
                      ? "bg-emerald-500 text-white"
                      : current
                      ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {completed ? <Check size={16} /> : <Icon size={15} />}
                </div>
                <span
                  className={`text-center text-[10px] font-semibold leading-tight ${
                    current
                      ? "text-emerald-700"
                      : completed
                      ? "text-slate-600"
                      : "text-slate-400"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              {i < STAGES.length - 1 && (
                <div
                  className={`mt-4.5 h-0.5 w-4 shrink-0 sm:w-8 ${
                    stage < order.stage ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Description + sub-progress */}
      <p className="mt-4 text-sm text-slate-600">{order.stageDescription}</p>

      {order.subProgress && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Progres analisis parameter</span>
            <span>
              {order.subProgress.done} dari {order.subProgress.total} selesai
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${
                  order.subProgress.total > 0
                    ? (order.subProgress.done / order.subProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Retest banner */}
      {order.retestBanner && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <RefreshCcw size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Sedang ditinjau ulang oleh tim lab
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {order.retestBanner}
            </p>
          </div>
        </div>
      )}

      {/* Aksi kontekstual */}
      {(order.stage === 4 ||
        order.stage === 5 ||
        order.stage === 6 ||
        order.invoiceStatus) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {order.stage === 4 && (
            <Link
              href="/coa/preliminary"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              <FileBadge size={15} />
              Lihat & Konfirmasi Hasil
            </Link>
          )}

          {(order.stage === 5 || order.stage === 6) && (
            <Link
              href="/coa/final"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <Award size={15} />
              Unduh Sertifikat
            </Link>
          )}

          {order.invoiceStatus && (
            <Link
              href="/customer/invoices"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <Receipt size={15} />
              {invoiceStatusLabel(order.invoiceStatus)}
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}
