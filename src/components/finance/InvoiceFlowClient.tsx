"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUpItem, staggerContainer } from "@/lib/motion";
import ExportButtons from "@/components/exports/ExportButtons";
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileBadge,
  FileCheck,
  Mail,
  Receipt,
  RefreshCcw,
  Search,
  Send,
  UserRound,
  Wallet,
} from "lucide-react";
import Disclosure from "@/components/ui/Disclosure";
import DocumentCode from "@/components/ui/DocumentCode";
import {
  formatShortDate,
  humanOrderTitle,
  parseDocumentNumber,
} from "@/lib/customer-labels";

type InvoiceMode = "create" | "approve" | "customer";

type Customer = {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;

  billingCompany?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingContactPerson?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;

  documentCompany?: string | null;
  recipientEmail1?: string | null;
};

type QuotationItem = {
  id: string;
  qty: number;
  price: number;
  description?: string | null;
  customerSampleId?: string | null;
  samplingLocation?: string | null;
  regulationMatrix?: string | null;
  durationSampling?: string | null;
  method?: string | null;
  parameter: {
    id: string;
    name: string;
    unit?: string | null;
    method?: string | null;
  };
};

type Sample = {
  id: string;
  sampleNo: string;
  status: string;
  coaTemplate?: {
    id: string;
    name: string;
    code: string;
  } | null;
  coa: Array<{
    id: string;
    coaNo: string;
    type: string;
    status: string;
  }>;
};

type QuotationReady = {
  id: string;
  quotationNo: string;
  status?: string;
  totalAmount: number;
  samplingCost?: number | null;
  vatPercent?: number | null;
  vatAmount?: number | null;
  grandTotal?: number | null;
  quotationDate?: string | null;
  validUntil?: string | null;
  customer: Customer;
  coaTemplate?: {
    id: string;
    name: string;
    code: string;
  } | null;
  items: QuotationItem[];
  purchaseOrder?: {
    id: string;
    poNumber: string;
    fileUrl?: string | null;
  } | null;
  ltr?: {
    id: string;
    ltrNo: string;
  } | null;
  coc?: {
    id: string;
    cocNo: string;
    sample?: {
      id: string;
      sampleNo: string;
      status: string;
    } | null;
  } | null;
  stps?: Array<{
    id: string;
    stpsNo: string;
    status: string;
  }>;
  samples: Sample[];
};

type Invoice = {
  id: string;
  invoiceNo: string;
  status: string;
  amount: number;
  createdAt: string;
  quotation: QuotationReady;
};

type Props = {
  mode: InvoiceMode;
  initialInvoices: Invoice[];
  initialReadyQuotations: QuotationReady[];
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getQuotationGrandTotal(quotation: QuotationReady) {
  return quotation.grandTotal && quotation.grandTotal > 0
    ? quotation.grandTotal
    : quotation.totalAmount || 0;
}

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    WAITING_APPROVAL: "bg-yellow-50 text-yellow-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
    SENT: "bg-blue-50 text-blue-700",
    PAID: "bg-purple-50 text-purple-700",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

function getInvoiceStatusText(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    WAITING_APPROVAL: "Waiting Approval",
    APPROVED: "Approved",
    SENT: "Sent to Customer",
    PAID: "Paid",
  };

  return labels[status] || status;
}

export default function InvoiceFlowClient({
  mode,
  initialInvoices,
  initialReadyQuotations,
}: Props) {
  const reduce = useReducedMotion();

  /** Mode customer memakai bahasa sehari-hari & judulnya ada di header halaman. */
  const isCustomerMode = mode === "customer";

  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [readyQuotations, setReadyQuotations] = useState<QuotationReady[]>(
    initialReadyQuotations
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const visibleInvoices = useMemo(() => {
    const keyword = search.toLowerCase();

    return invoices.filter((invoice) => {
      return (
        invoice.invoiceNo.toLowerCase().includes(keyword) ||
        invoice.status.toLowerCase().includes(keyword) ||
        invoice.quotation.quotationNo.toLowerCase().includes(keyword) ||
        invoice.quotation.customer.name.toLowerCase().includes(keyword) ||
        (invoice.quotation.customer.company || "")
          .toLowerCase()
          .includes(keyword) ||
        (invoice.quotation.coaTemplate?.name || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [invoices, search]);

  const waitingApprovalCount = invoices.filter(
    (invoice) => invoice.status === "WAITING_APPROVAL"
  ).length;

  const sentCount = invoices.filter((invoice) => invoice.status === "SENT").length;
  const paidCount = invoices.filter((invoice) => invoice.status === "PAID").length;

  async function refreshData() {
    const response = await fetch("/api/finance/invoices");
    const data = await response.json();

    if (response.ok) {
      setInvoices(data.invoices || []);
      setReadyQuotations(data.readyQuotations || []);
    }
  }

  async function runAction(
    endpoint: string,
    method: "POST" | "PATCH",
    body?: Record<string, unknown>
  ) {
    setLoading(true);
    setMessage("");

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Action gagal");
      return;
    }

    setMessage(data.message || "Action berhasil");
    await refreshData();
  }

  async function createInvoice(quotation: QuotationReady) {
    const defaultAmount = getQuotationGrandTotal(quotation);

    const amountInput = window.prompt(
      `Nominal invoice untuk ${quotation.quotationNo}`,
      String(defaultAmount)
    );

    if (!amountInput) return;

    const amount = Number(amountInput);

    if (Number.isNaN(amount) || amount < 0) {
      alert("Nominal invoice tidak valid.");
      return;
    }

    await runAction("/api/finance/invoices", "POST", {
      quotationId: quotation.id,
      amount,
    });
  }

  function renderInvoiceAction(invoice: Invoice) {
    if (mode !== "approve") return null;

    if (invoice.status === "WAITING_APPROVAL") {
      return (
        <button
          disabled={loading}
          onClick={() =>
            runAction(`/api/finance/invoices/${invoice.id}/approve`, "PATCH")
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          Approve
        </button>
      );
    }

    if (invoice.status === "APPROVED") {
      return (
        <button
          disabled={loading}
          onClick={() =>
            runAction(`/api/finance/invoices/${invoice.id}/send`, "PATCH")
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          <Send size={16} />
          Send Invoice
        </button>
      );
    }

    if (invoice.status === "SENT") {
      return (
        <button
          disabled={loading}
          onClick={() =>
            runAction(`/api/finance/invoices/${invoice.id}/paid`, "PATCH")
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-purple-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
        >
          <CreditCard size={16} />
          Mark Paid
        </button>
      );
    }

    return null;
  }

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial={reduce ? false : "hidden"}
      animate="visible"
      className="space-y-6"
    >
      {/* Ringkasan angka — dua kolom di mobile supaya empat metrik muat
          dalam satu layar, bukan empat kartu setinggi layar. */}
      <motion.div
        variants={fadeUpItem}
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
      >
        {[
          {
            label: isCustomerMode ? "Total tagihan" : "Total Invoice",
            value: invoices.length,
            icon: Receipt,
            tone: "bg-emerald-100 text-emerald-600",
          },
          {
            label: isCustomerMode ? "Sedang diproses" : "Waiting Approval",
            value: waitingApprovalCount,
            icon: FileCheck,
            tone: "bg-yellow-100 text-yellow-600",
          },
          {
            label: isCustomerMode ? "Perlu dibayar" : "Sent",
            value: sentCount,
            icon: Send,
            tone: "bg-blue-100 text-blue-600",
          },
          {
            label: isCustomerMode ? "Lunas" : "Paid",
            value: paidCount,
            icon: CreditCard,
            tone: "bg-purple-100 text-purple-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:rounded-[1.5rem] sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${stat.tone}`}
                >
                  <Icon size={18} />
                </span>
                <span className="text-2xl font-black leading-none text-slate-900 sm:text-3xl">
                  {stat.value}
                </span>
              </div>
              <p className="mt-2.5 text-[13px] font-bold leading-tight text-slate-700 sm:text-sm sm:font-normal sm:text-slate-500">
                {stat.label}
              </p>
            </div>
          );
        })}
      </motion.div>

      <motion.div
        variants={fadeUpItem}
        className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          {/* Judul halaman customer sudah ada di header atas; di sini cukup
              alat bantunya saja supaya tidak ada judul kembar. */}
          {!isCustomerMode && (
            <div>
              <p className="text-sm font-semibold text-emerald-600">
                Finance Flow
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {mode === "create" ? "Create Invoice" : "Approve Invoice"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                {mode === "create"
                  ? "Buat invoice berdasarkan quotation yang sudah memiliki Final COA."
                  : "Approve invoice, kirim invoice ke customer, dan tandai pembayaran."}
              </p>
            </div>
          )}

          <button
            onClick={refreshData}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:rounded-2xl sm:text-sm"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="relative mt-3 max-w-md sm:mt-5">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              isCustomerMode
                ? "Cari tagihan, nomor, jenis uji…"
                : "Cari invoice, quotation, customer..."
            }
            aria-label="Cari invoice"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 sm:rounded-2xl"
          />
        </div>

        {message && (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
            {message}
          </p>
        )}
      </motion.div>

      {mode === "create" && (
        <motion.div
          variants={fadeUpItem}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <BadgeDollarSign size={22} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                Ready to Invoice
              </h3>
              <p className="text-sm text-slate-500">
                Quotation dengan Final COA dan belum punya invoice.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {readyQuotations.map((quotation) => {
              const finalSample = quotation.samples[0];
              const finalCoa = finalSample?.coa?.find(
                (item) => item.type === "FINAL"
              );

              const grandTotal = getQuotationGrandTotal(quotation);
              const samplingCost = quotation.samplingCost || 0;
              const vatAmount = quotation.vatAmount || 0;

              return (
                <div
                  key={quotation.id}
                  className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black text-slate-900">
                          {quotation.quotationNo}
                        </p>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          FINAL COA
                        </span>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                        <p className="flex items-center gap-2">
                          <Building2 size={15} />
                          {quotation.customer.company ||
                            quotation.customer.name}
                        </p>

                        <p className="flex items-center gap-2">
                          <UserRound size={15} />
                          {quotation.customer.billingContactPerson ||
                            quotation.customer.contactPerson ||
                            "-"}
                        </p>

                        <p className="flex items-center gap-2">
                          <Mail size={15} />
                          {quotation.customer.billingEmail ||
                            quotation.customer.email ||
                            "-"}
                        </p>

                        <p className="flex items-center gap-2">
                          <FileBadge size={15} />
                          Final COA: {finalCoa?.coaNo || "-"}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-slate-500">Parameter Total</p>
                          <p className="mt-1 font-black text-slate-900">
                            {formatRupiah(quotation.totalAmount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-slate-500">Sampling Cost</p>
                          <p className="mt-1 font-black text-slate-900">
                            {formatRupiah(samplingCost)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-slate-500">
                            VAT {quotation.vatPercent || 0}%
                          </p>
                          <p className="mt-1 font-black text-slate-900">
                            {formatRupiah(vatAmount)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-emerald-700">Grand Total</p>
                          <p className="mt-1 font-black text-emerald-700">
                            {formatRupiah(grandTotal)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={loading}
                      onClick={() => createInvoice(quotation)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                    >
                      <BadgeDollarSign size={16} />
                      Create Invoice
                    </button>
                  </div>
                </div>
              );
            })}

            {readyQuotations.length === 0 && (
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                Belum ada quotation yang siap dibuat invoice.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* flex-col (bukan grid): grid item tanpa min-width:0 tumbuh mengikuti
          tabel min-w-[900px] di dalamnya, memaksa halaman melebar di HP. */}
      <motion.div variants={fadeUpItem} className="flex flex-col gap-4">
        {visibleInvoices.map((invoice) => {
          const quotation = invoice.quotation;
          const customer = quotation.customer;
          const finalSample = quotation.samples?.[0];
          const finalCoa = finalSample?.coa?.find(
            (item) => item.type === "FINAL"
          );

          return (
            <motion.div
              key={invoice.id}
              whileHover={reduce ? undefined : { y: -3 }}
              className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 sm:rounded-[2rem] sm:p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  {isCustomerMode ? (
                    <>
                      <h3 className="text-[15px] font-black leading-snug text-slate-900 sm:text-lg">
                        Tagihan {humanOrderTitle(quotation.coaTemplate?.name)}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-400 sm:text-xs">
                        <span className="font-mono text-slate-500">
                          {parseDocumentNumber(invoice.invoiceNo).short}
                        </span>
                        <span>{formatShortDate(invoice.createdAt)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-bold sm:text-xs",
                            getStatusStyle(invoice.status),
                          ].join(" ")}
                        >
                          {getInvoiceStatusText(invoice.status)}
                        </span>
                        <span className="text-[15px] font-black text-emerald-600 sm:text-base">
                          {formatRupiah(invoice.amount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-slate-900 sm:text-lg">
                        {invoice.invoiceNo}
                      </span>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          getStatusStyle(invoice.status),
                        ].join(" ")}
                      >
                        {getInvoiceStatusText(invoice.status)}
                      </span>
                    </div>
                  )}

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] sm:text-sm xl:grid-cols-4">
                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomerMode ? "Penawaran" : "Quotation"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-900">
                        {isCustomerMode
                          ? parseDocumentNumber(quotation.quotationNo).short
                          : quotation.quotationNo}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomerMode ? "Tanggal tagihan" : "Invoice Date"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {formatDate(invoice.createdAt)}
                      </dd>
                    </div>

                    {!isCustomerMode && (
                      <div className="min-w-0">
                        <dt className="text-slate-400">Customer</dt>
                        <dd className="truncate font-semibold text-slate-900">
                          {customer.company || customer.name}
                        </dd>
                      </div>
                    )}

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomerMode ? "Sertifikat" : "Final COA"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {finalCoa
                          ? isCustomerMode
                            ? parseDocumentNumber(finalCoa.coaNo).short
                            : finalCoa.coaNo
                          : "-"}
                      </dd>
                    </div>

                    {!isCustomerMode && (
                      <>
                        <div className="min-w-0">
                          <dt className="text-slate-400">PO</dt>
                          <dd className="truncate font-semibold text-slate-700">
                            {quotation.purchaseOrder?.poNumber || "-"}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-slate-400">LTR</dt>
                          <dd className="truncate font-semibold text-slate-700">
                            {quotation.ltr?.ltrNo || "-"}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-slate-400">COC</dt>
                          <dd className="truncate font-semibold text-slate-700">
                            {quotation.coc?.cocNo || "-"}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-slate-400">Sample</dt>
                          <dd className="truncate font-semibold text-slate-700">
                            {finalSample?.sampleNo || "-"}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>

                  {isCustomerMode && (
                    <DocumentCode
                      code={invoice.invoiceNo}
                      label="Kode tagihan"
                      className="mt-3"
                    />
                  )}

                  <div className="mt-3 grid gap-2 text-[11px] text-slate-600 sm:mt-4 sm:gap-3 sm:text-xs md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-bold text-slate-700">Invoice To</p>
                      <p className="mt-1">
                        {customer.billingCompany ||
                          customer.company ||
                          customer.name}
                      </p>
                      <p>
                        {customer.billingAddressLine1 ||
                          customer.billingAddressLine2 ||
                          "-"}
                      </p>
                      <p>
                        {customer.billingEmail || customer.email || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-bold text-slate-700">Document To</p>
                      <p className="mt-1">
                        {customer.documentCompany ||
                          customer.company ||
                          customer.name}
                      </p>
                      <p>{customer.recipientEmail1 || "-"}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="font-bold text-emerald-700">
                        Invoice Amount
                      </p>
                      <p className="mt-1 text-lg font-black text-emerald-700">
                        {formatRupiah(invoice.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 hidden overflow-hidden rounded-2xl border border-slate-200 sm:mt-4 sm:block">
                    <div className="overflow-auto">
                      <table className="w-full min-w-[900px] text-xs">
                        <thead className="bg-slate-50 text-left text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Sample ID</th>
                            <th className="px-4 py-3">Qty</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Subtotal</th>
                          </tr>
                        </thead>

                        <tbody>
                          {quotation.items.map((item) => (
                            <tr
                              key={item.id}
                              className="border-t border-slate-200"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {item.description || item.parameter.name}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {item.customerSampleId || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {item.qty}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {formatRupiah(item.price)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {formatRupiah(item.price * item.qty)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile: rincian biaya sebagai daftar, tabel 5 kolom
                      tidak terbaca di layar sempit. */}
                  <div className="mt-3 sm:hidden">
                    <Disclosure
                      label="Rincian biaya"
                      count={quotation.items.length}
                    >
                      <ul className="space-y-1.5">
                        {quotation.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-bold text-slate-800">
                                {item.description || item.parameter.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {item.qty} × {formatRupiah(item.price)}
                              </p>
                            </div>
                            <p className="shrink-0 text-[12px] font-black text-slate-900">
                              {formatRupiah(item.price * item.qty)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </Disclosure>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
  {renderInvoiceAction(invoice)}

  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
    <p className="mb-2 text-right text-[11px] font-bold text-slate-500">
      Invoice
    </p>
    <ExportButtons
      compact
      pdfUrl={`/api/exports/invoice/${invoice.id}/pdf`}
      excelUrl={`/api/exports/invoice/${invoice.id}/excel`}
    />
  </div>
</div>
              </div>
            </motion.div>
          );
        })}

        {visibleInvoices.length === 0 && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Data invoice belum tersedia.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}