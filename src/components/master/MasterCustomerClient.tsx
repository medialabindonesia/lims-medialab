"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@prisma/client";
import { KeyRound, Plus, RefreshCcw, Save, Search, X } from "lucide-react";

type Props = {
  initialCustomers: Customer[];
};

type CustomerForm = {
  id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  isActive: boolean;
};

const emptyForm: CustomerForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  isActive: true,
};

export default function MasterCustomerClient({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filteredCustomers = useMemo(() => {
    const keyword = search.toLowerCase();

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(keyword) ||
        (customer.company || "").toLowerCase().includes(keyword) ||
        (customer.email || "").toLowerCase().includes(keyword) ||
        (customer.phone || "").toLowerCase().includes(keyword)
      );
    });
  }, [customers, search]);

  function handleCreate() {
    setForm(emptyForm);
    setMessage("");
    setOpenForm(true);
  }

  function handleEdit(customer: Customer) {
    setForm({
      id: customer.id,
      name: customer.name,
      company: customer.company || "",
      email: customer.email || "",
      phone: customer.phone || "",
      isActive: customer.isActive,
    });

    setMessage("");
    setOpenForm(true);
  }

  async function refreshData() {
    const response = await fetch("/api/master/customers");
    const data = await response.json();

    if (response.ok) {
      setCustomers(data.customers);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const url = form.id
      ? `/api/master/customers/${form.id}`
      : "/api/master/customers";

    const method = form.id ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal menyimpan customer");
      return;
    }

    setMessage(data.message || "Berhasil menyimpan customer");
    setOpenForm(false);
    await refreshData();
  }

  async function handleDeactivate(customer: Customer) {
    const confirmDelete = window.confirm(
      `Nonaktifkan customer ${customer.name}?`
    );

    if (!confirmDelete) return;

    const response = await fetch(`/api/master/customers/${customer.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Gagal menonaktifkan customer");
      return;
    }

    await refreshData();
  }

  async function handleCreateLogin(customer: Customer) {
    if (!customer.email) {
      alert("Customer harus punya email dulu sebelum dibuat akun login.");
      return;
    }

    const password = window.prompt(
      `Masukkan password login untuk ${customer.name}`
    );

    if (!password) return;

    const response = await fetch(`/api/master/customers/${customer.id}/account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Gagal membuat akun login customer");
      return;
    }

    alert(
      `Akun login customer berhasil dibuat.\n\nEmail: ${customer.email}\nPassword: ${password}`
    );
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
              placeholder="Cari customer..."
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
              Tambah Customer
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
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-white text-left text-slate-600">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Company</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{customer.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{customer.id}</p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {customer.company || "-"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    <p>{customer.email || "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {customer.phone || "-"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        customer.isActive
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-600",
                      ].join(" ")}
                    >
                      {customer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleCreateLogin(customer)}
                      className="mr-2 inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 text-xs text-emerald-600 transition hover:bg-emerald-50"
                    >
                      <KeyRound size={13} />
                      Buat Login
                    </button>

                    <button
                      onClick={() => handleEdit(customer)}
                      className="mr-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeactivate(customer)}
                      className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600 transition hover:bg-red-400/10"
                    >
                      Nonaktifkan
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    Data customer belum ada.
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
                  {form.id ? "Edit Customer" : "Tambah Customer"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Lengkapi data customer.
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
                  Nama Customer
                </label>

                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="Contoh: PT Medialab Indonesia"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Company
                </label>

                <input
                  value={form.company}
                  onChange={(event) =>
                    setForm({ ...form, company: event.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="Nama perusahaan"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Email
                  </label>

                  <input
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="customer@email.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Phone
                  </label>

                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="08xxxx"
                  />
                </div>
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
                Customer aktif
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