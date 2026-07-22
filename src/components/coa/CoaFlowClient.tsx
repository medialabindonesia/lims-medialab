"use client";

import { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  FileBadge,
  RefreshCcw,
  ThumbsDown,
  X,
} from "lucide-react";
import ExportButtons from "@/components/exports/ExportButtons";

type CoaMode = "preliminary" | "final";

type Coa = {
  id: string;
  coaNo: string;
  type: "PRELIMINARY" | "FINAL";
  status: string;
};

type SampleParameter = {
  id: string;
  status: string;
  resultValue?: string | null;
  resultNote?: string | null;
  parameter: {
    id: string;
    name: string;
    unit?: string | null;
    method?: string | null;
  };
  templateParameter?: {
    id: string;
    displayName?: string | null;
    unit?: string | null;
    method?: string | null;
    standard?: string | null;
    limitValue?: string | null;
    sort: number;
  } | null;
};

type Sample = {
  id: string;
  sampleNo: string;
  status: string;
  customer: {
    id: string;
    name: string;
  };
  quotation?: {
    id: string;
    quotationNo: string;
  } | null;
  coaTemplate?: {
    id: string;
    name: string;
    code: string;
  } | null;
  parameters: SampleParameter[];
  coa: Coa[];
};

type Props = {
  mode: CoaMode;
  initialSamples: Sample[];
  viewerRole?: string;
};

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    VALIDATED: "bg-emerald-100 text-emerald-700",
    PRELIMINARY_COA: "bg-sky-100 text-sky-700",
    FINAL_COA: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-green-100 text-green-700",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

async function safeReadJson(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function CoaFlowClient({
  mode,
  initialSamples,
  viewerRole,
}: Props) {
  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Sample | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isCustomer = viewerRole === "CUSTOMER_ENGAGEMENT";

  const visibleSamples = useMemo(() => {
    if (mode === "preliminary") {
      return samples.filter((sample) =>
        ["VALIDATED", "PRELIMINARY_COA", "FINAL_COA"].includes(sample.status)
      );
    }

    return samples.filter((sample) =>
      ["PRELIMINARY_COA", "FINAL_COA"].includes(sample.status)
    );
  }, [mode, samples]);

  async function refreshData() {
    const response = await fetch("/api/coa");
    const data = await safeReadJson(response);

    if (response.ok) {
      setSamples(data.samples || []);
      return;
    }

    setMessage(data.message || "Gagal mengambil data COA terbaru");
  }

  async function runAction(endpoint: string, method: "POST" | "PATCH") {
    setLoading(true);
    setMessage("");

    const response = await fetch(endpoint, {
      method,
    });

    const data = await safeReadJson(response);

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Action gagal");
      return;
    }

    setMessage(data.message || "Action berhasil");
    await refreshData();
  }

  async function submitReject() {
    if (!rejectTarget || !rejectReason.trim()) return;

    setRejecting(true);
    setMessage("");

    const response = await fetch(`/api/coa/${rejectTarget.id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason.trim() }),
    });

    const data = await safeReadJson(response);

    setRejecting(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal mengirim permintaan revisi");
      return;
    }

    setMessage(data.message || "Permintaan revisi terkirim");
    setRejectTarget(null);
    setRejectReason("");
    await refreshData();
  }

  function renderAction(sample: Sample) {
    const preliminary = sample.coa.find((item) => item.type === "PRELIMINARY");
    const finalCoa = sample.coa.find((item) => item.type === "FINAL");

    if (mode === "preliminary") {
      if (sample.status === "VALIDATED" && !preliminary) {
        return (
          <button
            disabled={loading}
            onClick={() =>
              runAction(`/api/coa/${sample.id}/preliminary`, "POST")
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileBadge size={16} />
            Generate Preliminary
          </button>
        );
      }

      if (preliminary?.status === "SENT_TO_CUSTOMER") {
        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isCustomer && (
              <button
                disabled={loading}
                onClick={() => {
                  setRejectTarget(sample);
                  setRejectReason("");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ThumbsDown size={16} />
                Minta Revisi
              </button>
            )}

            <button
              disabled={loading}
              onClick={() =>
                runAction(`/api/coa/${sample.id}/customer-confirm`, "PATCH")
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              Confirm Preliminary
            </button>
          </div>
        );
      }

      return null;
    }

    if (mode === "final") {
      if (finalCoa) {
        return null;
      }

      if (preliminary?.status === "CUSTOMER_CONFIRMED") {
        return (
          <button
            disabled={loading}
            onClick={() => runAction(`/api/coa/${sample.id}/final`, "POST")}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Award size={16} />
            Generate Final COA
          </button>
        );
      }

      return null;
    }

    return null;
  }

  function renderExportButtons(sample: Sample) {
    const preliminary = sample.coa.find((item) => item.type === "PRELIMINARY");
    const finalCoa = sample.coa.find((item) => item.type === "FINAL");

    return (
      <div className="flex flex-col items-end gap-2">
        {renderAction(sample)}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <p className="mb-2 text-right text-[11px] font-bold text-slate-500">
            Lab Result
          </p>
          <ExportButtons
            compact
            pdfUrl={`/api/exports/sample/${sample.id}/result-pdf`}
            excelUrl={`/api/exports/sample/${sample.id}/result-excel`}
          />
        </div>

        {preliminary && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-2">
            <p className="mb-2 text-right text-[11px] font-bold text-sky-700">
              Preliminary COA
            </p>
            <ExportButtons
              compact
              pdfUrl={`/api/exports/coa/${preliminary.id}/pdf`}
              excelUrl={`/api/exports/coa/${preliminary.id}/excel`}
            />
          </div>
        )}

        {finalCoa && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-2">
            <p className="mb-2 text-right text-[11px] font-bold text-purple-700">
              Final COA
            </p>
            <ExportButtons
              compact
              pdfUrl={`/api/exports/coa/${finalCoa.id}/pdf`}
              excelUrl={`/api/exports/coa/${finalCoa.id}/excel`}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Certificate Flow
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {mode === "preliminary" ? "Preliminary COA" : "Final COA"}
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {mode === "preliminary"
                ? "Generate preliminary COA dari sample yang sudah tervalidasi, lalu customer melakukan confirm."
                : "Generate final COA setelah customer confirm preliminary COA."}
            </p>
          </div>

          <button
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>

      {/* flex-col (bukan grid) sengaja dipilih: grid item tanpa min-width:0
          tumbuh mengikuti konten (tabel min-w-[900px] di dalamnya), memaksa
          SELURUH HALAMAN melebar horizontal di layar sempit. flex-col tidak
          kena mekanisme "automatic minimum size" itu. */}
      <div className="flex flex-col gap-5">
        {visibleSamples.map((sample) => {
          const preliminary = sample.coa.find(
            (item) => item.type === "PRELIMINARY"
          );
          const finalCoa = sample.coa.find((item) => item.type === "FINAL");

          return (
            <div
              key={sample.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
            >
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">
                      {sample.sampleNo}
                    </h3>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        getStatusStyle(sample.status),
                      ].join(" ")}
                    >
                      {sample.status}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-2 xl:grid-cols-3">
                    <p>
                      Customer:{" "}
                      <span className="font-semibold text-slate-900">
                        {sample.customer.name}
                      </span>
                    </p>

                    <p>Quotation: {sample.quotation?.quotationNo || "-"}</p>

                    <p>Template: {sample.coaTemplate?.name || "-"}</p>

                    <p>
                      Preliminary:{" "}
                      {preliminary
                        ? `${preliminary.coaNo} / ${preliminary.status}`
                        : "-"}
                    </p>

                    <p>
                      Final:{" "}
                      {finalCoa
                        ? `${finalCoa.coaNo} / ${finalCoa.status}`
                        : "-"}
                    </p>
                  </div>
                </div>

                {renderExportButtons(sample)}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Result</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Standard</th>
                        <th className="px-4 py-3">Limit</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sample.parameters.map((item) => {
                        const displayName =
                          item.templateParameter?.displayName ||
                          item.parameter.name;

                        const method =
                          item.templateParameter?.method ||
                          item.parameter.method ||
                          "-";

                        const unit =
                          item.templateParameter?.unit ||
                          item.parameter.unit ||
                          "-";

                        return (
                          <tr
                            key={item.id}
                            className="border-t border-slate-200 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {displayName}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {method}
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {item.resultValue || "-"}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {unit}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {item.templateParameter?.standard || "-"}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {item.templateParameter?.limitValue || "-"}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {item.status}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {visibleSamples.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Data COA belum tersedia.
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  Minta Revisi
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-900">
                  {rejectTarget.sampleNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={rejecting}
                className="rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-3 text-sm text-slate-500">
              Jelaskan hasil apa yang menurut Anda perlu ditinjau ulang. Tim
              lab akan menguji ulang parameter terkait sebelum Preliminary
              COA diterbitkan kembali.
            </p>

            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              placeholder="Contoh: Hasil parameter X terasa tidak sesuai dengan kondisi lapangan, mohon dicek ulang."
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-400"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={rejecting}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={rejecting || !rejectReason.trim()}
                className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rejecting ? "Mengirim…" : "Kirim Permintaan Revisi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}