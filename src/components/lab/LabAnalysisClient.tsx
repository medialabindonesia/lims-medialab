"use client";

import { useMemo, useState } from "react";
import {
  CheckCheck,
  FlaskConical,
  RefreshCcw,
  RotateCcw,
  Save,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

type LabMode =
  | "conduct"
  | "enter"
  | "review"
  | "verify"
  | "validate"
  | "retest";

type Analyst = {
  id: string;
  name: string;
  email: string;
};

type SampleParameter = {
  id: string;
  analystId?: string | null;
  status: string;
  resultValue?: string | null;
  resultNote?: string | null;
  retestReason?: string | null;
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
  sample: {
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
  };
};

type Props = {
  mode: LabMode;
  initialSampleParameters: SampleParameter[];
  analysts: Analyst[];
};

type ResultDraft = {
  resultValue: string;
  resultNote: string;
};

type SampleGroup = {
  sample: SampleParameter["sample"];
  parameters: SampleParameter[];
};

const modeConfig: Record<
  LabMode,
  {
    title: string;
    description: string;
    empty: string;
  }
> = {
  conduct: {
    title: "Conduct Analysis",
    description:
      "Mulai semua parameter yang sudah dibagikan dalam satu sample.",
    empty: "Belum ada sample dengan parameter WAITING / RETEST.",
  },
  enter: {
    title: "Enter Results",
    description:
      "Input semua hasil parameter dalam satu tabel, lalu simpan sekaligus.",
    empty: "Belum ada sample dengan parameter IN_PROGRESS / RETEST.",
  },
  review: {
    title: "Review Results",
    description: "Review semua result ENTERED dalam satu sample.",
    empty: "Belum ada sample dengan result ENTERED.",
  },
  verify: {
    title: "Verify Results",
    description: "Verify semua result REVIEWED dalam satu sample.",
    empty: "Belum ada sample dengan result REVIEWED.",
  },
  validate: {
    title: "Validate Results",
    description: "Validate semua result VERIFIED dalam satu sample.",
    empty: "Belum ada sample dengan result VERIFIED.",
  },
  retest: {
    title: "Ask Retest",
    description: "Minta retest untuk semua result dalam satu sample.",
    empty: "Belum ada sample yang bisa diminta retest.",
  },
};

function getStatusStyle(status: string) {
  const styles: Record<string, string> = {
    WAITING: "bg-slate-100 text-slate-600",
    IN_PROGRESS: "bg-sky-100 text-sky-600",
    ENTERED: "bg-sky-100 text-sky-600",
    REVIEWED: "bg-amber-100 text-amber-600",
    VERIFIED: "bg-purple-100 text-purple-700",
    VALIDATED: "bg-emerald-100 text-emerald-600",
    RETEST: "bg-red-100 text-red-600",
  };

  return styles[status] || "bg-slate-100 text-slate-600";
}

function getDisplayName(item: SampleParameter) {
  return item.templateParameter?.displayName || item.parameter.name;
}

function getUnit(item: SampleParameter) {
  return item.templateParameter?.unit || item.parameter.unit || "";
}

function getMethod(item: SampleParameter) {
  return item.templateParameter?.method || item.parameter.method || "-";
}

function getVisibleParams(mode: LabMode, parameters: SampleParameter[]) {
  if (mode === "conduct") {
    return parameters.filter((item) =>
      ["WAITING", "RETEST"].includes(item.status)
    );
  }

  if (mode === "enter") {
    return parameters.filter((item) =>
      ["IN_PROGRESS", "RETEST"].includes(item.status)
    );
  }

  if (mode === "review") {
    return parameters.filter((item) => item.status === "ENTERED");
  }

  if (mode === "verify") {
    return parameters.filter((item) => item.status === "REVIEWED");
  }

  if (mode === "validate") {
    return parameters.filter((item) => item.status === "VERIFIED");
  }

  if (mode === "retest") {
    return parameters.filter((item) =>
      ["ENTERED", "REVIEWED", "VERIFIED", "VALIDATED"].includes(item.status)
    );
  }

  return parameters;
}

export default function LabAnalysisClient({
  mode,
  initialSampleParameters,
  analysts,
}: Props) {
  const [sampleParameters, setSampleParameters] = useState<SampleParameter[]>(
    initialSampleParameters
  );
  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const analystMap = useMemo(() => {
    return new Map(analysts.map((analyst) => [analyst.id, analyst]));
  }, [analysts]);

  const sampleGroups = useMemo(() => {
    const map = new Map<string, SampleGroup>();

    for (const item of sampleParameters) {
      const current = map.get(item.sample.id);

      if (current) {
        current.parameters.push(item);
      } else {
        map.set(item.sample.id, {
          sample: item.sample,
          parameters: [item],
        });
      }
    }

    return Array.from(map.values()).map((group) => ({
      ...group,
      parameters: group.parameters.sort((a, b) => {
        const sortA = a.templateParameter?.sort ?? 999;
        const sortB = b.templateParameter?.sort ?? 999;

        return sortA - sortB;
      }),
    }));
  }, [sampleParameters]);

  const visibleGroups = useMemo(() => {
    return sampleGroups
      .map((group) => ({
        ...group,
        visibleParameters: getVisibleParams(mode, group.parameters),
      }))
      .filter((group) => group.visibleParameters.length > 0);
  }, [mode, sampleGroups]);

  const config = modeConfig[mode];

  async function refreshData() {
    const response = await fetch("/api/lab/sample-parameters");
    const data = await response.json();

    if (response.ok) {
      setSampleParameters(data.sampleParameters);
    }
  }

  async function runAction(
    endpoint: string,
    method: "PATCH" = "PATCH",
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

  function updateDraft(
    sampleParameterId: string,
    key: keyof ResultDraft,
    value: string
  ) {
    setDrafts((prev) => ({
      ...prev,
      [sampleParameterId]: {
        resultValue:
          prev[sampleParameterId]?.resultValue ??
          sampleParameters.find((item) => item.id === sampleParameterId)
            ?.resultValue ??
          "",
        resultNote:
          prev[sampleParameterId]?.resultNote ??
          sampleParameters.find((item) => item.id === sampleParameterId)
            ?.resultNote ??
          "",
        [key]: value,
      },
    }));
  }

  async function submitResults(group: SampleGroup, visible: SampleParameter[]) {
    const results = visible.map((item) => {
      const draft = drafts[item.id];

      return {
        sampleParameterId: item.id,
        resultValue: draft?.resultValue ?? item.resultValue ?? "",
        resultNote: draft?.resultNote ?? item.resultNote ?? "",
      };
    });

    const emptyResult = results.find((item) => !item.resultValue.trim());

    if (emptyResult) {
      setMessage("Semua nilai result wajib diisi dulu bro.");
      return;
    }

    await runAction(`/api/lab/samples/${group.sample.id}/results`, "PATCH", {
      results,
    });
  }

  async function askRetest(group: SampleGroup) {
    const reason = window.prompt(
      `Alasan retest untuk sample ${group.sample.sampleNo}`
    );

    if (!reason) return;

    await runAction(`/api/lab/samples/${group.sample.id}/retest`, "PATCH", {
      reason,
    });
  }

  function renderAction(group: SampleGroup, visible: SampleParameter[]) {
    if (mode === "conduct") {
      return (
        <button
          disabled={loading}
          onClick={() =>
            runAction(`/api/lab/samples/${group.sample.id}/start`)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          <FlaskConical size={16} />
          Start All
        </button>
      );
    }

    if (mode === "enter") {
      return (
        <button
          disabled={loading}
          onClick={() => submitResults(group, visible)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          <Save size={16} />
          Simpan Semua Result
        </button>
      );
    }

    if (mode === "review") {
      return (
        <button
          disabled={loading}
          onClick={() =>
            runAction(`/api/lab/samples/${group.sample.id}/review`)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          <SearchCheck size={16} />
          Review All
        </button>
      );
    }

    if (mode === "verify") {
      return (
        <button
          disabled={loading}
          onClick={() =>
            runAction(`/api/lab/samples/${group.sample.id}/verify`)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          <CheckCheck size={16} />
          Verify All
        </button>
      );
    }

    if (mode === "validate") {
      return (
        <button
          disabled={loading}
          onClick={() =>
            runAction(`/api/lab/samples/${group.sample.id}/validate`)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          <ShieldCheck size={16} />
          Validate All
        </button>
      );
    }

    if (mode === "retest") {
      return (
        <button
          disabled={loading}
          onClick={() => askRetest(group)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-400/10 disabled:opacity-60"
        >
          <RotateCcw size={16} />
          Ask Retest
        </button>
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{config.title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {config.description}
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

      {/* flex-col (bukan grid): grid item tanpa min-width:0 tumbuh mengikuti
          tabel min-w-[1000px] di dalamnya, memaksa halaman melebar di HP. */}
      <div className="flex flex-col gap-5">
        {visibleGroups.map((group) => (
          <div
            key={group.sample.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:bg-slate-100"
          >
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {group.sample.sampleNo}
                  </h3>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {group.sample.status}
                  </span>
                </div>

                <p className="text-sm text-slate-600">
                  Customer: {group.sample.customer.name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Quotation: {group.sample.quotation?.quotationNo || "-"}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Template: {group.sample.coaTemplate?.name || "-"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Diproses: {group.visibleParameters.length} parameter
                </p>
              </div>

              <div className="flex justify-end">
                {renderAction(group, group.visibleParameters)}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="bg-white text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Standard / Limit</th>
                      <th className="px-4 py-3">Analyst</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Result</th>
                      {mode === "enter" && (
                        <th className="px-4 py-3">Note</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {group.visibleParameters.map((item) => {
                      const analyst = item.analystId
                        ? analystMap.get(item.analystId)
                        : null;

                      const resultValue =
                        drafts[item.id]?.resultValue ??
                        item.resultValue ??
                        "";

                      const resultNote =
                        drafts[item.id]?.resultNote ?? item.resultNote ?? "";

                      return (
                        <tr
                          key={item.id}
                          className="border-t border-slate-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {getDisplayName(item)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Unit: {getUnit(item) || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {getMethod(item)}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            <p>{item.templateParameter?.standard || "-"}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.templateParameter?.limitValue || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {analyst?.name || "-"}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={[
                                "rounded-full px-3 py-1 text-xs font-medium",
                                getStatusStyle(item.status),
                              ].join(" ")}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {mode === "enter" ? (
                              <input
                                value={resultValue}
                                onChange={(event) =>
                                  updateDraft(
                                    item.id,
                                    "resultValue",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                                placeholder="Input hasil"
                              />
                            ) : (
                              <span className="font-medium text-slate-900">
                                {item.resultValue || "-"}{" "}
                                {item.resultValue ? getUnit(item) : ""}
                              </span>
                            )}
                          </td>

                          {mode === "enter" && (
                            <td className="px-4 py-3">
                              <input
                                value={resultNote}
                                onChange={(event) =>
                                  updateDraft(
                                    item.id,
                                    "resultNote",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                                placeholder="Catatan"
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {mode === "retest" && (
              <p className="mt-4 text-sm text-red-600">
                Retest akan diterapkan ke semua parameter yang tampil pada sample
                ini.
              </p>
            )}
          </div>
        ))}

        {visibleGroups.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
            {config.empty}
          </div>
        )}
      </div>
    </div>
  );
}
