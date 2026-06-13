"use client";

import { useMemo, useState } from "react";
import { Award, CheckCircle2, FileBadge, RefreshCcw } from "lucide-react";

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
};

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    VALIDATED: "bg-emerald-100 text-emerald-600",
    PRELIMINARY_COA: "bg-sky-100 text-sky-600",
    FINAL_COA: "bg-purple-400/15 text-purple-300",
    COMPLETED: "bg-green-100 text-green-600",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

export default function CoaFlowClient({ mode, initialSamples }: Props) {
  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
    const data = await response.json();

    if (response.ok) {
      setSamples(data.samples);
    }
  }

  async function runAction(endpoint: string, method: "POST" | "PATCH") {
    setLoading(true);
    setMessage("");

    const response = await fetch(endpoint, {
      method,
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            <FileBadge size={16} />
            Generate Preliminary
          </button>
        );
      }

      if (preliminary?.status === "SENT_TO_CUSTOMER") {
        return (
          <button
            disabled={loading}
            onClick={() =>
              runAction(`/api/coa/${sample.id}/customer-confirm`, "PATCH")
            }
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            Confirm Preliminary
          </button>
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "preliminary" ? "Preliminary COA" : "Final COA"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {mode === "preliminary"
                ? "Generate preliminary COA dari sample yang sudah tervalidasi, lalu customer melakukan confirm."
                : "Generate final COA setelah customer confirm preliminary COA."}
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

      <div className="grid gap-5">
        {visibleSamples.map((sample) => {
          const preliminary = sample.coa.find(
            (item) => item.type === "PRELIMINARY"
          );
          const finalCoa = sample.coa.find((item) => item.type === "FINAL");

          return (
            <div
              key={sample.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:bg-slate-100"
            >
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {sample.sampleNo}
                    </h3>

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
                    Customer: {sample.customer.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Quotation: {sample.quotation?.quotationNo || "-"}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Template: {sample.coaTemplate?.name || "-"}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Preliminary:{" "}
                    {preliminary
                      ? `${preliminary.coaNo} / ${preliminary.status}`
                      : "-"}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Final: {finalCoa ? `${finalCoa.coaNo} / ${finalCoa.status}` : "-"}
                  </p>
                </div>

                <div className="flex justify-end">{renderAction(sample)}</div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-white text-left text-slate-600">
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
                            <td className="px-4 py-3 text-slate-900">
                              {displayName}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {method}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
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
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
            Data COA belum tersedia.
          </div>
        )}
      </div>
    </div>
  );
}