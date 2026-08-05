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
import PageHeader from "@/components/layout/PageHeader";
import DocumentCode from "@/components/ui/DocumentCode";
import { humanOrderTitle, parseDocumentNumber } from "@/lib/customer-labels";

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
  displayNameSnapshot?: string | null;
  unitSnapshot?: string | null;
  methodSnapshot?: string | null;
  standardSnapshot?: string | null;
  limitSnapshot?: string | null;
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
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-2xl sm:text-sm"
          >
            <FileBadge size={16} />
            Generate Preliminary
          </button>
        );
      }

      if (preliminary?.status === "SENT_TO_CUSTOMER") {
        return (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {isCustomer && (
              <button
                disabled={loading}
                onClick={() => {
                  setRejectTarget(sample);
                  setRejectReason("");
                }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-[13px] font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-2xl sm:text-sm"
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
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-2xl sm:text-sm"
            >
              <CheckCircle2 size={16} />
              {isCustomer ? "Hasil Sudah Sesuai" : "Confirm Preliminary"}
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
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-2xl sm:text-sm"
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

  const headerCopy = isCustomer
    ? mode === "preliminary"
      ? {
          title: "Hasil Uji Sementara",
          subtitle:
            "Periksa hasil uji laboratorium Anda, lalu konfirmasi bila sudah sesuai agar sertifikat resmi diterbitkan.",
          empty: "Belum ada hasil uji yang menunggu konfirmasi Anda.",
        }
      : {
          title: "Sertifikat Hasil Uji",
          subtitle:
            "Unduh sertifikat resmi (Final COA) untuk pesanan yang sudah Anda konfirmasi.",
          empty: "Belum ada sertifikat yang terbit.",
        }
    : mode === "preliminary"
      ? {
          title: "Preliminary COA",
          subtitle:
            "Generate preliminary COA dari sample yang sudah tervalidasi, lalu customer melakukan confirm.",
          empty: "Data COA belum tersedia.",
        }
      : {
          title: "Final COA",
          subtitle: "Generate final COA setelah customer confirm preliminary COA.",
          empty: "Data COA belum tersedia.",
        };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        className="mb-0"
        eyebrow={isCustomer ? "Hasil Uji" : "Certificate Flow"}
        title={headerCopy.title}
        subtitle={headerCopy.subtitle}
        actions={
          <button
            onClick={refreshData}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:rounded-2xl sm:text-sm"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        }
      >
        {message && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
            {message}
          </p>
        )}
      </PageHeader>

      {/* flex-col (bukan grid) sengaja dipilih: grid item tanpa min-width:0
          tumbuh mengikuti konten (tabel min-w-[900px] di dalamnya), memaksa
          SELURUH HALAMAN melebar horizontal di layar sempit. flex-col tidak
          kena mekanisme "automatic minimum size" itu. */}
      <div className="flex flex-col gap-3 sm:gap-5">
        {visibleSamples.map((sample) => {
          const preliminary = sample.coa.find(
            (item) => item.type === "PRELIMINARY"
          );
          const finalCoa = sample.coa.find((item) => item.type === "FINAL");
          const sampleDoc = parseDocumentNumber(sample.sampleNo);

          return (
            <div
              key={sample.id}
              className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 sm:rounded-3xl sm:p-5"
            >
              <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  {isCustomer ? (
                    <>
                      <h3 className="text-[15px] font-black leading-snug text-slate-900 sm:text-lg">
                        {humanOrderTitle(sample.coaTemplate?.name)}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400 sm:text-xs">
                        <span className="font-mono text-slate-500">
                          {sampleDoc.short}
                        </span>{" "}
                        · Sample yang Anda kirim
                      </p>
                    </>
                  ) : (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 sm:text-xl">
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
                  )}

                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] sm:text-sm xl:grid-cols-3">
                    {!isCustomer && (
                      <div className="min-w-0">
                        <dt className="text-slate-400">Customer</dt>
                        <dd className="truncate font-semibold text-slate-900">
                          {sample.customer.name}
                        </dd>
                      </div>
                    )}

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomer ? "Jenis uji" : "Template"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {sample.coaTemplate?.name || "-"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomer ? "Penawaran" : "Quotation"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {sample.quotation
                          ? isCustomer
                            ? parseDocumentNumber(sample.quotation.quotationNo)
                                .short
                            : sample.quotation.quotationNo
                          : "-"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomer ? "Hasil sementara" : "Preliminary"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {preliminary
                          ? isCustomer
                            ? parseDocumentNumber(preliminary.coaNo).short
                            : `${preliminary.coaNo} / ${preliminary.status}`
                          : "-"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-slate-400">
                        {isCustomer ? "Sertifikat" : "Final"}
                      </dt>
                      <dd className="truncate font-semibold text-slate-700">
                        {finalCoa
                          ? isCustomer
                            ? parseDocumentNumber(finalCoa.coaNo).short
                            : `${finalCoa.coaNo} / ${finalCoa.status}`
                          : "-"}
                      </dd>
                    </div>
                  </dl>

                  {isCustomer && (preliminary || finalCoa) && (
                    <DocumentCode
                      code={(finalCoa || preliminary)!.coaNo}
                      label="Kode dokumen hasil"
                      className="mt-3"
                    />
                  )}
                </div>

                {renderExportButtons(sample)}
              </div>

              {/* Mobile: tabel 7 kolom tidak terbaca di 390px, jadi tiap
                  parameter ditampilkan sebagai kartu ringkas. */}
              <ul className="space-y-2 sm:hidden">
                {sample.parameters.map((item) => {
                  const displayName =
                    item.displayNameSnapshot ||
                    item.templateParameter?.displayName ||
                    item.parameter.name;

                  const unit =
                    item.unitSnapshot ||
                    item.templateParameter?.unit ||
                    item.parameter.unit ||
                    "";

                  const standard =
                    item.standardSnapshot ||
                    item.templateParameter?.standard ||
                    "-";

                  const limit =
                    item.limitSnapshot ||
                    item.templateParameter?.limitValue ||
                    "-";

                  const method =
                    item.methodSnapshot ||
                    item.templateParameter?.method ||
                    item.parameter.method ||
                    "-";

                  return (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-slate-900">
                          {displayName}
                        </p>
                        <p className="shrink-0 text-right text-[13px] font-black text-slate-900">
                          {item.resultValue || "-"}
                          {unit && (
                            <span className="ml-0.5 text-[11px] font-semibold text-slate-400">
                              {unit}
                            </span>
                          )}
                        </p>
                      </div>

                      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <div className="min-w-0">
                          <dt className="text-slate-400">Baku mutu</dt>
                          <dd className="truncate font-semibold">{standard}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-slate-400">Batas</dt>
                          <dd className="truncate font-semibold">{limit}</dd>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <dt className="text-slate-400">Metode</dt>
                          <dd className="truncate font-semibold">{method}</dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 sm:block">
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
                          item.displayNameSnapshot ||
                          item.templateParameter?.displayName ||
                          item.parameter.name;

                        const method =
                          item.methodSnapshot ||
                          item.templateParameter?.method ||
                          item.parameter.method ||
                          "-";

                        const unit =
                          item.unitSnapshot ||
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
                              {item.standardSnapshot ||
                                item.templateParameter?.standard ||
                                "-"}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {item.limitSnapshot ||
                                item.templateParameter?.limitValue ||
                                "-"}
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
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500 shadow-sm sm:rounded-3xl sm:p-10 sm:text-base">
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
