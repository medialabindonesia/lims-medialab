"use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  CreditCard,
  RefreshCcw,
  Send,
} from "lucide-react";

type InvoiceMode = "create" | "approve";

type Customer = {
  id: string;
  name: string;
  company?: string | null;
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
  totalAmount: number;
  customer: Customer;
  coaTemplate?: {
    id: string;
    name: string;
    code: string;
  } | null;
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

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-400/15 text-slate-300",
    WAITING_APPROVAL: "bg-yellow-400/15 text-yellow-300",
    APPROVED: "bg-emerald-400/15 text-emerald-300",
    SENT: "bg-blue-400/15 text-blue-300",
    PAID: "bg-purple-400/15 text-purple-300",
  };

  return styles[status] || "bg-slate-400/15 text-slate-300";
}

export default function InvoiceFlowClient({
  mode,
  initialInvoices,
  initialReadyQuotations,
}: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [readyQuotations, setReadyQuotations] = useState<QuotationReady[]>(
    initialReadyQuotations
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const visibleInvoices = useMemo(() => {
    if (mode === "create") {
      return invoices;
    }

    return invoices.filter((invoice) =>
      ["WAITING_APPROVAL", "APPROVED", "SENT", "PAID"].includes(invoice.status)
    );
  }, [mode, invoices]);

  async function refreshData() {
    const response = await fetch("/api/finance/invoices");
    const data = await response.json();

    if (response.ok) {
      setInvoices(data.invoices);
      setReadyQuotations(data.readyQuotations);
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
    const amountInput = window.prompt(
      `Nominal invoice untuk ${quotation.quotationNo}`,
      String(quotation.totalAmount)
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
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
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
          className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-300 disabled:opacity-60"
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
          className="inline-flex items-center gap-2 rounded-xl bg-purple-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-purple-300 disabled:opacity-60"
        >
          <CreditCard size={16} />
          Mark Paid
        </button>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "create" ? "Create Invoice" : "Approve Invoice"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {mode === "create"
                ? "Buat invoice dari quotation yang sudah memiliki Final COA."
                : "Approve invoice, kirim invoice ke customer, dan tandai pembayaran."}
            </p>
          </div>

          <button
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            {message}
          </p>
        )}
      </div>

      {mode === "create" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
              <BadgeDollarSign size={22} />
            </div>

            <div>
              <h3 className="text-xl font-bold">Ready to Invoice</h3>
              <p className="text-sm text-slate-400">
                Quotation dengan Final COA dan belum punya invoice.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {readyQuotations.map((quotation) => {
              const finalSample = quotation.samples[0];
              const finalCoa = finalSample?.coa?.find(
                (item) => item.type === "FINAL"
              );

              return (
                <div
                  key={quotation.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {quotation.quotationNo}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Customer: {quotation.customer.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Template: {quotation.coaTemplate?.name || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Final COA: {finalCoa?.coaNo || "-"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      Amount: {formatRupiah(quotation.totalAmount)}
                    </p>
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => createInvoice(quotation)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                  >
                    <BadgeDollarSign size={16} />
                    Create Invoice
                  </button>
                </div>
              );
            })}

            {readyQuotations.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-8 text-center text-sm text-slate-400">
                Belum ada quotation yang siap dibuat invoice.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {visibleInvoices.map((invoice) => {
          const finalSample = invoice.quotation.samples?.[0];
          const finalCoa = finalSample?.coa?.find(
            (item) => item.type === "FINAL"
          );

          return (
            <div
              key={invoice.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">
                      {invoice.invoiceNo}
                    </span>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        getStatusStyle(invoice.status),
                      ].join(" ")}
                    >
                      {invoice.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300">
                    Quotation:{" "}
                    <span className="font-medium text-white">
                      {invoice.quotation.quotationNo}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Customer: {invoice.quotation.customer.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Template: {invoice.quotation.coaTemplate?.name || "-"}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Final COA: {finalCoa?.coaNo || "-"}
                  </p>

                  <p className="mt-2 text-lg font-bold text-white">
                    {formatRupiah(invoice.amount)}
                  </p>
                </div>

                <div className="flex justify-end">
                  {renderInvoiceAction(invoice)}
                </div>
              </div>
            </div>
          );
        })}

        {visibleInvoices.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
            Data invoice belum tersedia.
          </div>
        )}
      </div>
    </div>
  );
}