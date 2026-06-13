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
    VALIDATED: "bg-emerald-400/15 text-emerald-300",
    PRELIMINARY_COA: "bg-blue-400/15 text-blue-300",
    FINAL_COA: "bg-purple-400/15 text-purple-300",
    COMPLETED: "bg-green-400/15 text-green-300",
  };

  return styles[status] || "bg-slate-400/15 text-slate-300";
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
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

      <div className="grid gap-5">
        {visibleSamples.map((sample) => {
          const preliminary = sample.coa.find(
            (item) => item.type === "PRELIMINARY"
          );
          const finalCoa = sample.coa.find((item) => item.type === "FINAL");

          return (
            <div
              key={sample.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
            >
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
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

                  <p className="text-sm text-slate-300">
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

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="overflow-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-900 text-left text-slate-300">
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
                            className="border-t border-white/10 hover:bg-white/5"
                          >
                            <td className="px-4 py-3 text-white">
                              {displayName}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {method}
                            </td>
                            <td className="px-4 py-3 font-medium text-white">
                              {item.resultValue || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {unit}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {item.templateParameter?.standard || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {item.templateParameter?.limitValue || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
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
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
            Data COA belum tersedia.
          </div>
        )}
      </div>
    </div>
  );
}