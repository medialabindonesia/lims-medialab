"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  CheckCheck,
  Check,
  ChevronRight,
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
import {
  formatShortDate,
  humanOrderTitle,
  parseDocumentNumber,
  type StatusTone,
} from "@/lib/customer-labels";
import { cn } from "@/lib/cn";
import Disclosure from "@/components/ui/Disclosure";
import DocumentCode from "@/components/ui/DocumentCode";
import StatusBadge from "@/components/ui/StatusBadge";
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

/** Tahap 0 & 4 menunggu tindakan customer, tahap 5-6 sudah tuntas. */
const STAGE_TONE: Record<OrderStage, StatusTone> = {
  0: "warn",
  1: "info",
  2: "info",
  3: "info",
  4: "warn",
  5: "success",
  6: "success",
};

function invoiceStatusLabel(status: string | null) {
  switch (status) {
    case "DRAFT":
      return "Tagihan sedang disiapkan";
    case "WAITING_APPROVAL":
      return "Tagihan menunggu approval internal";
    case "APPROVED":
      return "Tagihan disetujui, segera dikirim";
    case "SENT":
      return "Tagihan terkirim, menunggu pembayaran";
    case "PAYMENT_SUBMITTED":
      return "Bukti pembayaran sedang diverifikasi";
    case "PAID":
      return "Tagihan lunas";
    default:
      return "Menunggu tagihan diterbitkan";
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
  const doc = parseDocumentNumber(order.quotationNo);
  const orderDate = formatShortDate(order.updatedAt);

  return (
    <motion.div
      variants={reduce ? undefined : fadeUpItem}
      custom={index}
      className="group relative rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md sm:rounded-3xl sm:p-6"
    >
      {/* Overlay link — seluruh kartu clickable menuju detail. Elemen aksi di
          bawah diberi z-10 supaya tetap bisa diklik di atas overlay ini. */}
      <Link
        href={`/customer/orders/${order.id}`}
        aria-label={`Lihat detail pesanan ${humanOrderTitle(order.templateName)} ${doc.short}`}
        className="absolute inset-0 z-0 rounded-[1.25rem] sm:rounded-3xl"
      />

      {/* Header: judul manusiawi dulu, kode dokumen jadi info sekunder supaya
          customer mengenali pesanan dari jenis ujinya, bukan dari deret angka. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-black leading-snug text-slate-900 transition-colors group-hover:text-emerald-700 sm:text-lg">
            {humanOrderTitle(order.templateName)}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-400 sm:text-xs">
            <span className="font-mono text-slate-500">{doc.short}</span>
            {doc.revision !== null && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                Revisi {doc.revision}
              </span>
            )}
            {orderDate && <span>{orderDate}</span>}
            {isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                <Zap size={10} />
                {order.tatRequested === "TOP_URGENT" ? "Sangat Cepat" : "Cepat"}
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={18}
          className="mt-0.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"
        />
      </div>

      {/* Status + penjelasan */}
      <div className="mt-3">
        <StatusBadge
          label={STAGE_LABELS[order.stage]}
          tone={STAGE_TONE[order.stage]}
        />
        <p className="mt-2 text-[13px] leading-5 text-slate-600 sm:text-sm">
          {order.stageDescription}
        </p>
      </div>

      {/* Progres ringkas — mobile. Tujuh langkah berlabel panjang tidak muat
          di lebar 390px, jadi dipadatkan menjadi bar bersegmen. */}
      <div className="mt-3 sm:hidden">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
          <span className="truncate text-slate-500">
            Tahap {order.stage + 1} dari {STAGES.length}
          </span>
          {order.estimatedCoaDate && (
            <span className="inline-flex shrink-0 items-center gap-1 text-slate-400">
              <Clock size={11} />
              {formatShortDate(order.estimatedCoaDate)}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex gap-1" aria-hidden="true">
          {STAGES.map((stage) => (
            <span
              key={stage}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                stage <= order.stage ? "bg-emerald-500" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Stepper penuh — hanya di layar sedang ke atas yang ruangnya cukup. */}
      <motion.div
        variants={reduce ? undefined : staggerContainer(0.05)}
        initial={reduce ? undefined : "hidden"}
        animate="visible"
        className="mt-4 hidden items-start gap-1.5 overflow-x-auto pb-1 sm:flex"
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
              <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    completed
                      ? "bg-emerald-500 text-white"
                      : current
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                        : "bg-slate-100 text-slate-400"
                  )}
                >
                  {completed ? <Check size={16} /> : <Icon size={15} />}
                </div>
                <span
                  className={cn(
                    "text-center text-[10px] font-semibold leading-tight",
                    current
                      ? "text-emerald-700"
                      : completed
                        ? "text-slate-600"
                        : "text-slate-400"
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    "mt-4.5 h-0.5 w-8 shrink-0",
                    stage < order.stage ? "bg-emerald-500" : "bg-slate-200"
                  )}
                />
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Sub-progress analisis parameter */}
      {order.subProgress && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 sm:text-xs">
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
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:rounded-2xl sm:p-4">
          <RefreshCcw size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-amber-800 sm:text-sm">
              Sedang ditinjau ulang oleh tim lab
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-amber-700 sm:text-xs">
              {order.retestBanner}
            </p>
          </div>
        </div>
      )}

      {/* Detail sekunder khusus mobile: tahapan lengkap & kode dokumen resmi. */}
      <div className="mt-2 border-t border-slate-100 pt-1 sm:hidden">
        <Disclosure label="Rincian tahapan & kode dokumen">
          <ol className="space-y-1.5">
            {STAGES.map((stage) => {
              const completed = stage < order.stage;
              const current = stage === order.stage;

              return (
                <li key={stage} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      completed || current
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {completed ? <Check size={11} /> : stage + 1}
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      current
                        ? "text-emerald-700"
                        : completed
                          ? "text-slate-600"
                          : "text-slate-400"
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                </li>
              );
            })}
          </ol>

          <DocumentCode
            code={order.quotationNo}
            label="Kode penawaran"
            className="mt-3"
          />
        </Disclosure>
      </div>

      {/* Aksi kontekstual */}
      {(order.stage === 4 ||
        order.stage === 5 ||
        order.stage === 6 ||
        order.invoiceStatus) && (
        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:mt-5 sm:pt-4">
          {order.stage === 4 && (
            <Link
              href="/coa/preliminary"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-600 sm:flex-none sm:rounded-2xl sm:text-sm"
            >
              <FileBadge size={15} />
              Lihat &amp; Konfirmasi Hasil
            </Link>
          )}

          {(order.stage === 5 || order.stage === 6) && (
            <Link
              href="/coa/final"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-none sm:rounded-2xl sm:text-sm"
            >
              <Award size={15} />
              Unduh Sertifikat
            </Link>
          )}

          {order.invoiceStatus && (
            <Link
              href="/customer/invoices"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-center text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-none sm:rounded-2xl sm:text-sm"
            >
              <Receipt size={15} className="shrink-0" />
              {invoiceStatusLabel(order.invoiceStatus)}
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}
