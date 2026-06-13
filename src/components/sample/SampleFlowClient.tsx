"use client";

import { useMemo, useState } from "react";
import { FlaskConical, PackageCheck, Plus, RefreshCcw, Send } from "lucide-react";

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
    SAMPLE_SENT: "bg-sky-100 text-sky-600",
    RECEIVED: "bg-emerald-100 text-emerald-600",
    DISTRIBUTED: "bg-purple-400/15 text-purple-300",
    IN_ANALYSIS: "bg-orange-100 text-orange-600",
    COMPLETED: "bg-green-100 text-green-600",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
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
        (sample) => sample.status === "RECEIVED" || sample.status === "DISTRIBUTED"
      );
    }

    return samples;
  }, [mode, samples]);

  async function refreshData() {
    const response = await fetch("/api/samples");
    const data = await response.json();

    if (response.ok) {
      setSamples(data.samples);
    }
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

    const data = await response.json();

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

    const data = await response.json();

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

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Gagal distribute parameter");
      return;
    }

    setMessage(data.message || "Parameter berhasil dibagi");
    await refreshData();
  }

  function updateAnalyst(sampleId: string, sampleParameterId: string, analystId: string) {
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "receive" ? "Receive Sample" : "Distribute Parameter"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {mode === "receive"
                ? "Buat sample dari quotation yang sudah COC_CREATED lalu terima sample di lab."
                : "Bagikan parameter sample ke user dengan role LAB_ANALYST."}
            </p>
          </div>

          <button
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Create Sample From COC</h3>
              <p className="text-sm text-slate-400">
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
                  <p className="mt-1 text-sm text-slate-400">
                    Customer: {quotation.customer.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    COC: {quotation.coc?.cocNo || "-"}
                  </p>
                </div>

                <button
                  disabled={loading}
                  onClick={() => createSampleFromQuotation(quotation.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  <Send size={16} />
                  Kirim Sample
                </button>
              </div>
            ))}

            {readyQuotations.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
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
            className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:bg-slate-100"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{sample.sampleNo}</span>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      getStatusStyle(sample.status),
                    ].join(" ")}
                  >
                    {sample.status}
                  </span>
                </div>

                <p className="text-sm text-slate-600">
                  Customer:{" "}
                  <span className="font-medium text-slate-900">
                    {sample.customer.name}
                  </span>
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Quotation: {sample.quotation?.quotationNo || "-"}
                </p>

                <div className="mt-4 grid gap-3">
                  {sample.parameters.map((parameter) => (
                    <div
                      key={parameter.id}
                      className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_260px]"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
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

              <div className="flex justify-end">
                {mode === "receive" && sample.status === "SAMPLE_SENT" && (
                  <button
                    disabled={loading}
                    onClick={() => receiveSample(sample.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <PackageCheck size={16} />
                    Receive Sample
                  </button>
                )}

                {mode === "distribute" && (
                  <button
                    disabled={loading}
                    onClick={() => distributeSample(sample)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <FlaskConical size={16} />
                    Distribute
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {visibleSamples.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
            {mode === "receive"
              ? "Belum ada sample yang dikirim customer."
              : "Belum ada sample yang siap dibagi ke analyst."}
          </div>
        )}
      </div>
    </div>
  );
}