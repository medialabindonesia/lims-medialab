"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatShortDate, quotationStatusMeta } from "@/lib/customer-labels";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/layout/PageHeader";
import { Search, FilePlus, FileCheck, FilePenLine, BadgeCheck, LayoutDashboard, Mail } from "lucide-react";
import QuotationEmailHistory from "./QuotationEmailHistory";

type Quotation = {
  id: string;
  quotationNo: string;
  status: string;
  totalAmount?: number;
  grandTotal?: number;
  pricingStatus?: string | null;
  quotationDate?: string | null;
  validUntil?: string | null;
  customer: { id: string; name: string; company?: string | null };
  createdAt: string;
};

type Props = {
  initialQuotations: Quotation[];
  viewerRole?: string;
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof FilePlus; href: string; color: string }> = {
  REQUESTED: { label: "Menunggu Verifikasi", icon: FileCheck, href: "/quotations/verify", color: "text-blue-600 bg-blue-50 border-blue-200" },
  VERIFIED: { label: "Menunggu Approval", icon: BadgeCheck, href: "/quotations/approve", color: "text-amber-600 bg-amber-50 border-amber-200" },
  APPROVED: { label: "Siap Dikirim", icon: FilePlus, href: "/quotations/request", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  SENT: { label: "Terkirim", icon: FilePenLine, href: "/quotations/request", color: "text-purple-600 bg-purple-50 border-purple-200" },
  CONFIRMED: { label: "Dikonfirmasi", icon: FilePenLine, href: "/quotations/request", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  REJECTED: { label: "Ditolak", icon: FilePenLine, href: "/quotations/revise", color: "text-red-600 bg-red-50 border-red-200" },
};

const STATUS_ORDER = ["REQUESTED", "VERIFIED", "APPROVED", "SENT", "CONFIRMED", "REJECTED"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function QuotationHomeClient({ initialQuotations, viewerRole }: Props) {
  const [search, setSearch] = useState("");
  const isCustomerView = viewerRole === "CUSTOMER_ENGAGEMENT";

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of initialQuotations) {
      map[q.status] = (map[q.status] || 0) + 1;
    }
    return map;
  }, [initialQuotations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return initialQuotations;
    const needle = search.toLowerCase();
    return initialQuotations.filter(
      (q) =>
        q.quotationNo.toLowerCase().includes(needle) ||
        q.customer.name.toLowerCase().includes(needle) ||
        (q.customer.company || "").toLowerCase().includes(needle)
    );
  }, [initialQuotations, search]);

  const summaryCards = STATUS_ORDER.filter((status) => counts[status]).map((status) => ({
    status,
    ...STATUS_CONFIG[status] || { label: status, icon: LayoutDashboard, href: "/quotations", color: "text-slate-600 bg-slate-50 border-slate-200" },
    count: counts[status],
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-5">
      <PageHeader
        title={isCustomerView ? "Penawaran Saya" : "Home Quotation"}
        subtitle={`${initialQuotations.length} quotation tercatat`}
      />

      {/* Ringkasan per status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map(({ status, label, icon: Icon, href, color, count }) => (
          <Link
            key={status}
            href={href}
            className={`flex items-center gap-3 rounded-2xl border p-4 transition-all hover:scale-[1.02] hover:shadow-sm ${color}`}
          >
            <Icon size={20} className="shrink-0 opacity-70" />
            <div>
              <p className="text-2xl font-black leading-none">{count}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-tight opacity-70">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pencarian */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor, nama customer, atau perusahaan…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Daftar quotation */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <LayoutDashboard size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-400">
            {search ? "Tidak ada quotation yang cocok dengan pencarian." : "Belum ada quotation."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => {
            const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.REQUESTED;
            return (
              <div
                key={q.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-800">{q.quotationNo}</span>
                    <StatusBadge label={quotationStatusMeta(q.status).label} tone={quotationStatusMeta(q.status).tone} />
                    {q.pricingStatus === "UNPRICED" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Belum Berharga</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {q.customer.company || q.customer.name}
                    {q.quotationDate && (
                      <span className="ml-2 text-xs text-slate-400">
                        · {formatShortDate(new Date(q.quotationDate))}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {!isCustomerView && typeof q.grandTotal === "number" && q.grandTotal > 0 && (
                    <span className="text-sm font-bold text-slate-700">{formatCurrency(q.grandTotal)}</span>
                  )}
                  <Link
                    href={cfg.href}
                    className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    {q.status === "REQUESTED" ? "Verify" : q.status === "VERIFIED" ? "Approve" : "Lihat"}
                  </Link>
                  <QuotationEmailHistory quotationId={q.id} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
