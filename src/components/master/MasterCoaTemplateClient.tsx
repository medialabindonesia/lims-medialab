"use client";

import { useMemo, useState } from "react";
import type {
  AnalysisParameter,
  CoaTemplate,
  CoaTemplateParameter,
} from "@prisma/client";
import { FileBadge, Plus, RefreshCcw, Save, Search, X } from "lucide-react";

type TemplateWithParams = CoaTemplate & {
  parameters: Array<
    CoaTemplateParameter & {
      parameter: AnalysisParameter;
    }
  >;
};

type Props = {
  initialTemplates: TemplateWithParams[];
  parameters: AnalysisParameter[];
};

type TemplateParamForm = {
  parameterId: string;
  displayName: string;
  unit: string;
  method: string;
  standard: string;
  limitValue: string;
  sort: number;
  isRequired: boolean;
  isActive: boolean;
};

type TemplateForm = {
  id?: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  parameters: TemplateParamForm[];
};

const emptyForm: TemplateForm = {
  name: "",
  code: "",
  description: "",
  isActive: true,
  parameters: [],
};

function normalizeCode(value: string) {
  return value.toUpperCase().replaceAll(" ", "_");
}

export default function MasterCoaTemplateClient({
  initialTemplates,
  parameters,
}: Props) {
  const [templates, setTemplates] =
    useState<TemplateWithParams[]>(initialTemplates);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filteredTemplates = useMemo(() => {
    const keyword = search.toLowerCase();

    return templates.filter((template) => {
      return (
        template.name.toLowerCase().includes(keyword) ||
        template.code.toLowerCase().includes(keyword) ||
        (template.description || "").toLowerCase().includes(keyword)
      );
    });
  }, [templates, search]);

  function makeParamForm(parameter: AnalysisParameter, sort: number) {
    return {
      parameterId: parameter.id,
      displayName: parameter.name,
      unit: parameter.unit || "",
      method: parameter.method || "",
      standard: "",
      limitValue: "",
      sort,
      isRequired: true,
      isActive: true,
    };
  }

  function handleCreate() {
    setForm(emptyForm);
    setMessage("");
    setOpenForm(true);
  }

  function handleEdit(template: TemplateWithParams) {
    setForm({
      id: template.id,
      name: template.name,
      code: template.code,
      description: template.description || "",
      isActive: template.isActive,
      parameters: template.parameters.map((item, index) => ({
        parameterId: item.parameterId,
        displayName: item.displayName || item.parameter.name,
        unit: item.unit || item.parameter.unit || "",
        method: item.method || item.parameter.method || "",
        standard: item.standard || "",
        limitValue: item.limitValue || "",
        sort: item.sort || index + 1,
        isRequired: item.isRequired,
        isActive: item.isActive,
      })),
    });

    setMessage("");
    setOpenForm(true);
  }

  async function refreshData() {
    const response = await fetch("/api/master/coa-templates");
    const data = await response.json();

    if (response.ok) {
      setTemplates(data.templates);
    }
  }

  function addParameter() {
    const available = parameters.find(
      (parameter) =>
        !form.parameters.some((item) => item.parameterId === parameter.id)
    );

    if (!available) {
      alert("Semua parameter sudah ditambahkan.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        makeParamForm(available, prev.parameters.length + 1),
      ],
    }));
  }

  function removeParameter(index: number) {
    setForm((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateParameter(
    index: number,
    key: keyof TemplateParamForm,
    value: string | number | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      parameters: prev.parameters.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      ),
    }));
  }

  function changeParameter(index: number, parameterId: string) {
    const selected = parameters.find((parameter) => parameter.id === parameterId);

    if (!selected) return;

    setForm((prev) => ({
      ...prev,
      parameters: prev.parameters.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              parameterId,
              displayName: selected.name,
              unit: selected.unit || "",
              method: selected.method || "",
            }
          : item
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const url = form.id
      ? `/api/master/coa-templates/${form.id}`
      : "/api/master/coa-templates";

    const method = form.id ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        code: normalizeCode(form.code),
        description: form.description,
        isActive: form.isActive,
        parameters: form.parameters,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal menyimpan template COA");
      return;
    }

    setMessage(data.message || "Template COA berhasil disimpan");
    setOpenForm(false);
    await refreshData();
  }

  async function handleDeactivate(template: TemplateWithParams) {
    const confirmDelete = window.confirm(
      `Nonaktifkan template ${template.name}?`
    );

    if (!confirmDelete) return;

    const response = await fetch(`/api/master/coa-templates/${template.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Gagal menonaktifkan template");
      return;
    }

    await refreshData();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari template COA..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={refreshData}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <RefreshCcw size={17} />
              Refresh
            </button>

            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Plus size={17} />
              Tambah Template
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:bg-slate-100"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                    <FileBadge size={20} />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {template.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {template.code}
                    </p>
                  </div>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      template.isActive
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-red-100 text-red-600",
                    ].join(" ")}
                  >
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {template.description && (
                  <p className="text-sm text-slate-400">
                    {template.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {template.parameters.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                    >
                      {item.sort}. {item.displayName || item.parameter.name}
                      {item.limitValue ? ` · Limit: ${item.limitValue}` : ""}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDeactivate(template)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600 transition hover:bg-red-400/10"
                >
                  Nonaktifkan
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
            Template COA belum ada.
          </div>
        )}
      </div>

      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {form.id ? "Edit Template COA" : "Tambah Template COA"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Atur jenis COA, parameter, baku mutu, metode, dan urutan tampil.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenForm(false)}
                className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Nama Template
                </label>
                <input
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm({
                      ...form,
                      name,
                      code: form.id ? form.code : normalizeCode(name),
                    });
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="Contoh: Air Ambient"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Kode Template
                </label>
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      code: normalizeCode(event.target.value),
                    })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="AIR_AMBIENT"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm text-slate-600">
                Deskripsi
              </label>
              <input
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                placeholder="Deskripsi template"
              />
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm({ ...form, isActive: event.target.checked })
                }
                className="h-4 w-4 accent-emerald-500"
              />
              Template aktif
            </label>

            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Parameter Template</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Pilih parameter, set nama tampil, satuan, metode, baku mutu,
                    dan urutan di COA.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addParameter}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Tambah Parameter
                </button>
              </div>

              <div className="space-y-3">
                {form.parameters.map((item, index) => (
                  <div
                    key={`${item.parameterId}-${index}`}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1.3fr_1fr_0.7fr_1fr_1fr_1fr_80px_90px]"
                  >
                    <select
                      value={item.parameterId}
                      onChange={(event) =>
                        changeParameter(index, event.target.value)
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                    >
                      {parameters.map((parameter) => (
                        <option key={parameter.id} value={parameter.id}>
                          {parameter.name}
                        </option>
                      ))}
                    </select>

                    <input
                      value={item.displayName}
                      onChange={(event) =>
                        updateParameter(index, "displayName", event.target.value)
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                      placeholder="Nama tampil"
                    />

                    <input
                      value={item.unit}
                      onChange={(event) =>
                        updateParameter(index, "unit", event.target.value)
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                      placeholder="Unit"
                    />

                    <input
                      value={item.method}
                      onChange={(event) =>
                        updateParameter(index, "method", event.target.value)
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                      placeholder="Method"
                    />

                    <input
                      value={item.standard}
                      onChange={(event) =>
                        updateParameter(index, "standard", event.target.value)
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                      placeholder="Standard"
                    />

                    <input
                      value={item.limitValue}
                      onChange={(event) =>
                        updateParameter(index, "limitValue", event.target.value)
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                      placeholder="Baku mutu"
                    />

                    <input
                      type="number"
                      value={item.sort}
                      onChange={(event) =>
                        updateParameter(index, "sort", Number(event.target.value || 0))
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                      placeholder="Sort"
                    />

                    <button
                      type="button"
                      onClick={() => removeParameter(index)}
                      className="rounded-2xl border border-red-200 px-3 py-3 text-sm text-red-600 hover:bg-red-400/10"
                    >
                      Hapus
                    </button>
                  </div>
                ))}

                {form.parameters.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                    Belum ada parameter di template ini.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenForm(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>

              <button
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                <Save size={17} />
                {loading ? "Menyimpan..." : "Simpan Template"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}