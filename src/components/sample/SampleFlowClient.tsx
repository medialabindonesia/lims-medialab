"use client";

import { useMemo, useState } from "react";
import {
  FlaskConical,
  PackageCheck,
  Plus,
  RefreshCcw,
  Send,
} from "lucide-react";
import ExportButtons from "@/components/exports/ExportButtons";

type SampleMode = "receive" | "distribute";

type Analyst = {
  id: string;
  name: string;
  email: string;
};

type QuotationReady = {
  id: string;
  quotationNo: string;
  customer: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    qty: number;
    parameter: {
      id: string;
      name: string;
    };
  }>;
  coc?: {
    cocNo: string;
  } | null;
};

type SampleParameter = {
  id: string;
  analystId?: string | null;
  status: string;
  parameter: {
    id: string;
    name: string;
    unit?: string | null;
  };
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
  parameters: SampleParameter[];
};

type Props = {
  mode: SampleMode;
  initialSamples: Sample[];
  quotationsReady: QuotationReady[];
  analysts: Analyst[];
};

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    WAITING_SAMPLE: "bg-slate-100 text-slate-600",
    SAMPLE_SENT: "bg-sky-100 text-sky-700",
    RECEIVED: "bg-emerald-100 text-emerald-700",
    DISTRIBUTED: "bg-purple-100 text-purple-700",
    IN_ANALYSIS: "bg-orange-100 text-orange-700",
    REVIEWED: "bg-cyan-100 text-cyan-700",
    VERIFIED: "bg-blue-100 text-blue-700",
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

export default function SampleFlowClient({
  mode,
  initialSamples,
  quotationsReady,
  analysts,
}: Props) {
  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [readyQuotations, setReadyQuotations] =
    useState<QuotationReady[]>(quotationsReady);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const visibleSamples = useMemo(() => {
    if (mode === "receive") {
      return samples.filter((sample) => sample.status === "SAMPLE_SENT");
    }

    if (mode === "distribute") {
      return samples.filter(
        (sample) =>
          sample.status === "RECEIVED" || sample.status === "DISTRIBUTED"
      );
    }

    return samples;
  }, [mode, samples]);

  async function refreshData() {
    const response = await fetch("/api/samples");
    const data = await safeReadJson(response);

    if (response.ok) {
      setSamples(data.samples || []);
      return;
    }

    setMessage(data.message || "Gagal mengambil data sample terbaru");
  }

  async function createSampleFromQuotation(quotationId: string) {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/samples", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quotationId }),
    });

    const data = await safeReadJson(response);

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal membuat sample");
      return;
    }

    setMessage(data.message || "Sample berhasil dibuat");
    setReadyQuotations((prev) =>
      prev.filter((quotation) => quotation.id !== quotationId)
    );
    await refreshData();
  }

  async function receiveSample(sampleId: string) {
    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/samples/${sampleId}/receive`, {
      method: "PATCH",
    });

    const data = await safeReadJson(response);

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal menerima sample");
      return;
    }

    setMessage(data.message || "Sample berhasil diterima");
    await refreshData();
  }

  async function distributeSample(sample: Sample) {
    if (analysts.length === 0) {
      alert("Belum ada user dengan role LAB_ANALYST.");
      return;
    }

    setLoading(true);
    setMessage("");

    const assignments = sample.parameters.map((parameter) => ({
      sampleParameterId: parameter.id,
      analystId: parameter.analystId || analysts[0].id,
    }));

    const response = await fetch(`/api/samples/${sample.id}/distribute`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assignments }),
    });

    const data = await safeReadJson(response);

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal distribute parameter");
      return;
    }

    setMessage(data.message || "Parameter berhasil dibagi");
    await refreshData();
  }

  function updateAnalyst(
    sampleId: string,
    sampleParameterId: string,
    analystId: string
  ) {
    setSamples((prev) =>
      prev.map((sample) =>
        sample.id === sampleId
          ? {
              ...sample,
              parameters: sample.parameters.map((parameter) =>
                parameter.id === sampleParameterId
                  ? {
                      ...parameter,
                      analystId,
                    }
                  : parameter
              ),
            }
          : sample
      )
    );
  }

  function renderAction(sample: Sample) {
    return (
      <div className="flex flex-col items-end gap-2">
        {mode === "receive" && sample.status === "SAMPLE_SENT" && (
          <button
            disabled={loading}
            onClick={() => receiveSample(sample.id)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PackageCheck size={16} />
            Receive Sample
          </button>
        )}

        {mode === "distribute" && (
          <button
            disabled={loading}
            onClick={() => distributeSample(sample)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FlaskConical size={16} />
            Distribute
          </button>
        )}

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Sample Flow
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {mode === "receive" ? "Receive Sample" : "Distribute Parameter"}
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {mode === "receive"
                ? "Buat sample dari quotation yang sudah COC_CREATED lalu terima sample di lab."
                : "Bagikan parameter sample ke user dengan role LAB_ANALYST."}
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

      {mode === "receive" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <Plus size={20} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                Create Sample From COC
              </h3>
              <p className="text-sm text-slate-500">
                Quotation dengan status COC_CREATED bisa dibuat sample.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {readyQuotations.map((quotation) => (
              <div
                key={quotation.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {quotation.quotationNo}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Customer: {quotation.customer.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    COC: {quotation.coc?.cocNo || "-"}
                  </p>
                </div>

                <button
                  disabled={loading}
                  onClick={() => createSampleFromQuotation(quotation.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} />
                  Kirim Sample
                </button>
              </div>
            ))}

            {readyQuotations.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada quotation COC_CREATED yang siap dibuat sample.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {visibleSamples.map((sample) => (
          <div
            key={sample.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-lg font-black text-slate-900">
                    {sample.sampleNo}
                  </span>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      getStatusStyle(sample.status),
                    ].join(" ")}
                  >
                    {sample.status}
                  </span>
                </div>

                <p className="text-sm text-slate-600">
                  Customer:{" "}
                  <span className="font-semibold text-slate-900">
                    {sample.customer.name}
                  </span>
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Quotation: {sample.quotation?.quotationNo || "-"}
                </p>

                <div className="mt-4 grid gap-3">
                  {sample.parameters.map((parameter) => (
                    <div
                      key={parameter.id}
                      className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_260px]"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {parameter.parameter.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Status: {parameter.status}
                        </p>
                      </div>

                      {mode === "distribute" && (
                        <select
                          value={parameter.analystId || analysts[0]?.id || ""}
                          onChange={(event) =>
                            updateAnalyst(
                              sample.id,
                              parameter.id,
                              event.target.value
                            )
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                        >
                          {analysts.map((analyst) => (
                            <option key={analyst.id} value={analyst.id}>
                              {analyst.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {renderAction(sample)}
            </div>
          </div>
        ))}

        {visibleSamples.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            {mode === "receive"
              ? "Belum ada sample yang dikirim customer."
              : "Belum ada sample yang siap dibagi ke analyst."}
          </div>
        )}
      </div>
    </div>
  );
}