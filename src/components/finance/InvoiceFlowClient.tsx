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
      <motion.div
        variants={fadeUpItem}
        className="grid gap-4 md:grid-cols-4"
      >
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
            <Receipt size={22} />
          </div>
          <p className="text-sm text-slate-500">Total Invoice</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {invoices.length}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-yellow-100 p-3 text-yellow-600">
            <FileCheck size={22} />
          </div>
          <p className="text-sm text-slate-500">Waiting Approval</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {waitingApprovalCount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-blue-600">
            <Send size={22} />
          </div>
          <p className="text-sm text-slate-500">Sent</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {sentCount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 inline-flex rounded-2xl bg-purple-100 p-3 text-purple-600">
            <CreditCard size={22} />
          </div>
          <p className="text-sm text-slate-500">Paid</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {paidCount}
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUpItem}
        className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Finance Flow
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {mode === "create"
                ? "Create Invoice"
                : mode === "approve"
                  ? "Approve Invoice"
                  : "Customer Invoice"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {mode === "create"
                ? "Buat invoice berdasarkan quotation yang sudah memiliki Final COA."
                : mode === "approve"
                  ? "Approve invoice, kirim invoice ke customer, dan tandai pembayaran."
                  : "Customer dapat melihat invoice yang sudah dibuat oleh finance."}
            </p>
          </div>

          <button
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>

        <div className="relative mt-5 max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari invoice, quotation, customer..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-emerald-500"
          />
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
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
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-black text-slate-900">
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

                  <div className="grid gap-3 text-sm text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                    <p>
                      Quotation:{" "}
                      <span className="font-semibold text-slate-900">
                        {quotation.quotationNo}
                      </span>
                    </p>

                    <p>Invoice Date: {formatDate(invoice.createdAt)}</p>

                    <p>
                      Customer:{" "}
                      <span className="font-semibold text-slate-900">
                        {customer.company || customer.name}
                      </span>
                    </p>

                    <p>Final COA: {finalCoa?.coaNo || "-"}</p>

                    <p>PO: {quotation.purchaseOrder?.poNumber || "-"}</p>
                    <p>LTR: {quotation.ltr?.ltrNo || "-"}</p>
                    <p>COC: {quotation.coc?.cocNo || "-"}</p>
                    <p>Sample: {finalSample?.sampleNo || "-"}</p>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
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

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
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
                </div>

                <div className="flex flex-col items-end gap-2">
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