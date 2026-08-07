"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Eye,
  FileBadge,
  FileCheck,
  FilePlus,
  FileSignature,
  FileText,
  FlaskConical,
  Microscope,
  Package,
  PackageCheck,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  Split,
  Upload,
  UserRound,
  Zap,
} from "lucide-react";
import { fadeUpItem, staggerContainer } from "@/lib/motion";
import type { OrderStage } from "@/lib/order-tracking";
import type { OrderDetail } from "@/lib/order-detail";
import ExportButtons from "@/components/exports/ExportButtons";
import DocumentCode from "@/components/ui/DocumentCode";
import { humanOrderTitle, parseDocumentNumber } from "@/lib/customer-labels";

const iconMap: Record<string, ElementType> = {
  FilePlus,
  FileCheck,
  FileSignature,
  ClipboardCheck,
  Package,
  PackageCheck,
  Split,
  Microscope,
  FlaskConical,
  Eye,
  ShieldCheck,
  BadgeCheck,
  RefreshCcw,
  FileBadge,
  Check,
  Award,
  Receipt,
  Upload,
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
const STAGE_ICONS: Record<OrderStage, ElementType> = {
  0: FilePlus,
  1: FileCheck,
  2: PackageCheck,
  3: Microscope,
  4: FileBadge,
  5: Award,
  6: CheckCheck,
};

const TONE_DOT: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-500",
  info: "bg-sky-100 text-sky-600",
  positive: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-700",
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

export default function OrderDetailClient({ detail }: { detail: OrderDetail }) {
  const reduce = useReducedMotion();
  const { summary } = detail;
  const isUrgent =
    detail.tatLabel === "Urgent" || detail.tatLabel === "Top Urgent";
  const needsConfirm = summary.stage === 4;
  const needsPayment = summary.invoiceStatus === "SENT";
  const hasFinalCert = detail.documents.some((d) => d.kind === "final-coa");
  const orderDoc = parseDocumentNumber(summary.quotationNo);

  return (
    <section className="min-h-screen pb-10">
      {/* Back */}
      <Link
        href="/dashboard/customer"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft size={16} />
        Kembali ke Dashboard
      </Link>

      {/* Header */}
      <motion.div
        initial={reduce ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-7"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-emerald-600 sm:text-sm">
              Detail Pesanan
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {humanOrderTitle(summary.templateName)}
              </h1>
              {isUrgent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                  <Zap size={11} />
                  {detail.tatLabel}
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-400 sm:text-xs">
              <span className="font-mono text-slate-500">
                {orderDoc.short}
              </span>
              {orderDoc.revision !== null && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                  Revisi {orderDoc.revision}
                </span>
              )}
              <span>{summary.templateName || "Template belum ditentukan"}</span>
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-emerald-100">
              <Clock size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-[11px]">
                Tahap saat ini
              </p>
              <p className="text-[13px] font-black text-emerald-800 sm:text-sm">
                {summary.stageLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Progres ringkas — mobile */}
        <div className="mt-4 sm:hidden">
          <p className="text-[11px] font-bold text-slate-500">
            Tahap {summary.stage + 1} dari {STAGES.length}
          </p>
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {STAGES.map((stage) => (
              <span
                key={stage}
                className={`h-1.5 flex-1 rounded-full ${
                  stage <= summary.stage ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stepper penuh — sm ke atas */}
        <div className="mt-7 hidden items-start gap-1 overflow-x-auto pb-1 sm:flex">
          {STAGES.map((stage, i) => {
            const Icon = STAGE_ICONS[stage];
            const completed = stage < summary.stage;
            const current = stage === summary.stage;
            return (
              <div key={stage} className="flex items-start">
                <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 sm:w-24">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      completed
                        ? "bg-emerald-500 text-white"
                        : current
                          ? "bg-emerald-500 text-white ring-4 ring-emerald-100"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {completed ? <Check size={17} /> : <Icon size={16} />}
                  </div>
                  <span
                    className={`text-center text-[10px] font-semibold leading-tight sm:text-[11px] ${
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
                    className={`mt-5 h-0.5 w-5 shrink-0 sm:w-9 ${
                      stage < summary.stage ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[13px] leading-5 text-slate-600 sm:mt-5 sm:text-sm">
          {summary.stageDescription}
        </p>

        <DocumentCode
          code={summary.quotationNo}
          label="Kode penawaran"
          className="mt-3 sm:hidden"
        />

        {/* Contextual CTAs */}
        {(needsConfirm || needsPayment || hasFinalCert) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 sm:mt-5 sm:pt-5">
            {needsConfirm && (
              <Link
                href="/coa/preliminary"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-600 sm:flex-none sm:rounded-2xl sm:text-sm"
              >
                <FileBadge size={15} />
                Lihat &amp; Konfirmasi Hasil
              </Link>
            )}
            {needsPayment && (
              <Link
                href="/customer/invoices"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-600 sm:flex-none sm:rounded-2xl sm:text-sm"
              >
                <Receipt size={15} />
                Bayar Tagihan
              </Link>
            )}
            {hasFinalCert && (
              <Link
                href="/coa/final"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-none sm:rounded-2xl sm:text-sm"
              >
                <Award size={15} />
                Halaman Sertifikat
              </Link>
            )}
          </div>
        )}
      </motion.div>

      {/* Two-column body */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3">
        {/* LEFT: timeline + parameters.
            min-w-0 wajib: tanpa ini grid item memakai min-width:auto sehingga
            melebar mengikuti konten (tabel/teks) dan membocorkan overflow ke
            body di layar sempit. */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6 lg:col-span-2">
          {/* Timeline */}
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <h2 className="mb-4 text-base font-black text-slate-900 sm:mb-5 sm:text-lg">
              Riwayat Pesanan
            </h2>

            {detail.timeline.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada aktivitas.</p>
            ) : (
              <motion.ol
                variants={reduce ? undefined : staggerContainer(0.04)}
                initial={reduce ? undefined : "hidden"}
                animate="visible"
                className="relative"
              >
                {detail.timeline.map((ev, i) => {
                  const Icon = iconMap[ev.icon] ?? FilePlus;
                  const isLast = i === detail.timeline.length - 1;
                  return (
                    <motion.li
                      key={ev.id}
                      variants={reduce ? undefined : fadeUpItem}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      {!isLast && (
                        <span className="absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-0.5 bg-slate-100" />
                      )}
                      <span
                        className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          TONE_DOT[ev.tone] ?? TONE_DOT.neutral
                        }`}
                      >
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-bold text-slate-800">{ev.title}</p>
                        {ev.detail && (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {ev.detail}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                          <span>{formatDateTime(ev.at)}</span>
                          {ev.actor && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                                <UserRound size={11} />
                                {ev.actor}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </motion.ol>
            )}
          </div>

          {/* Parameters */}
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <h2 className="mb-3 text-base font-black text-slate-900 sm:mb-4 sm:text-lg">
              Parameter &amp; Hasil Uji
            </h2>

            {/* Mobile: satu kartu per parameter — tabel 4 kolom memaksa
                scroll horizontal di layar 390px. */}
            <ul className="space-y-2 sm:hidden">
              {detail.parameters.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold leading-snug text-slate-800">
                        {p.name}
                      </p>
                      {p.regulation && (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {p.regulation}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-[13px] font-black text-slate-900">
                      {p.resultValue ? (
                        <>
                          {p.resultValue}
                          {p.unit ? (
                            <span className="ml-0.5 text-[11px] font-semibold text-slate-400">
                              {p.unit}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-slate-400">
                      {p.method || "Metode belum ditentukan"}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.status === "VALIDATED"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "RETEST"
                            ? "bg-amber-100 text-amber-700"
                            : p.status === "WAITING"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {p.statusLabel}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Parameter</th>
                      <th className="px-4 py-3 font-semibold">Metode</th>
                      <th className="px-4 py-3 font-semibold">Hasil</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.parameters.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-slate-100 align-top"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">
                            {p.name}
                          </p>
                          {p.regulation && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {p.regulation}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {p.method || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {p.resultValue ? (
                            <span className="font-semibold text-slate-800">
                              {p.resultValue}
                              {p.unit ? ` ${p.unit}` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              p.status === "VALIDATED"
                                ? "bg-emerald-100 text-emerald-700"
                                : p.status === "RETEST"
                                  ? "bg-amber-100 text-amber-700"
                                  : p.status === "WAITING"
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {p.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: summary + documents + costt */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          {/* Ringkasan */}
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <h2 className="mb-3 text-lg font-black text-slate-900">
              Ringkasan
            </h2>
            <div className="divide-y divide-slate-100">
              <InfoRow
                label="Customer"
                value={detail.company || detail.customerName}
              />
              {detail.sampleNo && (
                <InfoRow label="No. Sample" value={detail.sampleNo} />
              )}
              <InfoRow
                label="Tanggal Pesan"
                value={formatDate(detail.quotationDate)}
              />
              {detail.samplingByLabel && (
                <InfoRow
                  label="Metode Sampling"
                  value={detail.samplingByLabel}
                />
              )}
              {detail.objectiveLabel && (
                <InfoRow label="Tujuan Uji" value={detail.objectiveLabel} />
              )}
              {detail.tatLabel && (
                <InfoRow label="Prioritas (TAT)" value={detail.tatLabel} />
              )}
              {(detail.plannedSamplingStart || detail.plannedSamplingEnd) && (
                <InfoRow
                  label="Jadwal Sampling"
                  value={`${formatDate(detail.plannedSamplingStart)}${
                    detail.plannedSamplingEnd
                      ? ` – ${formatDate(detail.plannedSamplingEnd)}`
                      : ""
                  }`}
                />
              )}
              {detail.estimatedCoaDate && (
                <InfoRow
                  label="Estimasi Selesai"
                  value={formatDate(detail.estimatedCoaDate)}
                />
              )}
            </div>
          </div>

          {/* Dokumen */}
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <h2 className="mb-1 text-lg font-black text-slate-900">
              Pusat Dokumen
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              Preview langsung di web atau unduh berkasnya.
            </p>
            <div className="flex flex-col gap-3">
              {detail.documents.map((doc) => (
                <div
                  key={doc.kind}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <FileText size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">{doc.label}</p>
                      <p className="truncate text-xs text-slate-400">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  <ExportButtons
                    pdfUrl={doc.pdfUrl}
                    excelUrl={doc.excelUrl}
                    title={`${doc.label} · ${summary.quotationNo}`}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Biaya */}
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <h2 className="mb-3 text-base font-black text-slate-900 sm:mb-4 sm:text-lg">
              Rincian Biaya
            </h2>

            <div className="space-y-2.5">
              {detail.cost.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 text-slate-600">
                    {it.description}
                    <span className="text-slate-400"> × {it.qty}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-slate-700">
                    {it.subtotal === null ? (
                      <span className="text-slate-400">Belum ditetapkan</span>
                    ) : (
                      formatRupiah(it.subtotal)
                    )}
                  </span>
                </div>
              ))}
            </div>

            {detail.cost.hasUnpricedItems && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                Sebagian harga belum ditetapkan. Total di bawah belum final.
              </p>
            )}

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatRupiah(detail.cost.itemsSubtotal)}</span>
              </div>
              {detail.cost.samplingCost > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Biaya Sampling</span>
                  <span>{formatRupiah(detail.cost.samplingCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>PPN ({detail.cost.vatPercent}%)</span>
                <span>{formatRupiah(detail.cost.vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
                <span>Total</span>
                <span>{formatRupiah(detail.cost.grandTotal)}</span>
              </div>
            </div>

            {detail.cost.invoice && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Invoice</p>
                    <p className="text-sm font-bold text-slate-700">
                      {detail.cost.invoice.invoiceNo}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      detail.cost.invoice.status === "PAID"
                        ? "bg-emerald-100 text-emerald-700"
                        : detail.cost.invoice.status === "SENT"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {detail.cost.invoice.statusLabel}
                  </span>
                </div>
                {detail.cost.invoice.paidAt && (
                  <p className="mt-2 text-xs text-slate-400">
                    Dibayar {formatDate(detail.cost.invoice.paidAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
