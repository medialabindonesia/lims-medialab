"use client";

import { useMemo, useState } from "react";
import type { AnalysisParameter } from "@prisma/client";
import { Plus, RefreshCcw, Save, Search, X } from "lucide-react";

type Props = {
  initialParameters: AnalysisParameter[];
};

type ParameterForm = {
  id?: string;
  name: string;
  unit: string;
  method: string;
  price: string;
  isActive: boolean;
};

const emptyForm: ParameterForm = {
  name: "",
  unit: "",
  method: "",
  price: "0",
  isActive: true,
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MasterParameterClient({ initialParameters }: Props) {
  const [parameters, setParameters] =
    useState<AnalysisParameter[]>(initialParameters);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ParameterForm>(emptyForm);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filteredParameters = useMemo(() => {
    const keyword = search.toLowerCase();

    return parameters.filter((parameter) => {
      return (
        parameter.name.toLowerCase().includes(keyword) ||
        (parameter.unit || "").toLowerCase().includes(keyword) ||
        (parameter.method || "").toLowerCase().includes(keyword)
      );
    });
  }, [parameters, search]);

  function handleCreate() {
    setForm(emptyForm);
    setMessage("");
    setOpenForm(true);
  }

  function handleEdit(parameter: AnalysisParameter) {
    setForm({
      id: parameter.id,
      name: parameter.name,
      unit: parameter.unit || "",
      method: parameter.method || "",
      price: String(parameter.price),
      isActive: parameter.isActive,
    });
    setMessage("");
    setOpenForm(true);
  }

  async function refreshData() {
    const response = await fetch("/api/master/parameters");
    const data = await response.json();

    if (response.ok) {
      setParameters(data.parameters);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const url = form.id
      ? `/api/master/parameters/${form.id}`
      : "/api/master/parameters";

    const method = form.id ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        price: Number(form.price || 0),
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal menyimpan parameter");
      return;
    }

    setMessage(data.message || "Berhasil");
    setOpenForm(false);
    await refreshData();
  }

  async function handleDeactivate(parameter: AnalysisParameter) {
    const confirmDelete = window.confirm(
      `Nonaktifkan parameter ${parameter.name}?`
    );

    if (!confirmDelete) return;

    const response = await fetch(`/api/master/parameters/${parameter.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Gagal menonaktifkan parameter");
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
              placeholder="Cari parameter..."
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
              Tambah Parameter
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white text-left text-slate-600">
              <tr>
                <th className="px-5 py-4">Parameter</th>
                <th className="px-5 py-4">Unit</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredParameters.map((parameter) => (
                <tr
                  key={parameter.id}
                  className="border-t border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{parameter.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {parameter.id}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {parameter.unit || "-"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {parameter.method || "-"}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    {formatRupiah(parameter.price)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        parameter.isActive
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-600",
                      ].join(" ")}
                    >
                      {parameter.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleEdit(parameter)}
                      className="mr-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(parameter)}
                      className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600 transition hover:bg-red-400/10"
                    >
                      Nonaktifkan
                    </button>
                  </td>
                </tr>
              ))}

              {filteredParameters.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    Data parameter belum ada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {form.id ? "Edit Parameter" : "Tambah Parameter"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Lengkapi data parameter analisis.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenForm(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Nama Parameter
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="Contoh: pH"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Unit
                  </label>
                  <input
                    value={form.unit}
                    onChange={(event) =>
                      setForm({ ...form, unit: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="Contoh: %, mg/L, ppm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Price
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="50000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Method
                </label>
                <input
                  value={form.method}
                  onChange={(event) =>
                    setForm({ ...form, method: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="Contoh: Gravimetry, Kjeldahl, Electrometry"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                  className="h-4 w-4 accent-emerald-500"
                />
                Parameter aktif
              </label>
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
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}