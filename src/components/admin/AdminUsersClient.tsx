"use client";

import { useMemo, useState } from "react";
import type { Customer, Role, User } from "@prisma/client";
import {
  Ban,
  KeyRound,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import Select from "@/components/ui/Select";

type UserWithRelations = User & {
  role: Role;
  customer?: Customer | null;
};

type Props = {
  initialUsers: UserWithRelations[];
  roles: Role[];
  customers: Customer[];
};

type UserForm = {
  id?: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
  customerId: string;
  isActive: boolean;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  roleId: "",
  customerId: "",
  isActive: true,
};

export default function AdminUsersClient({
  initialUsers,
  roles,
  customers,
}: Props) {
  const [users, setUsers] = useState<UserWithRelations[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<UserForm>({
    ...emptyForm,
    roleId: roles[0]?.id || "",
  });
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.role.name.toLowerCase().includes(keyword) ||
        (user.customer?.name || "").toLowerCase().includes(keyword)
      );
    });
  }, [search, users]);

  function handleCreate() {
    setForm({
      ...emptyForm,
      roleId: roles[0]?.id || "",
    });
    setMessage("");
    setOpenForm(true);
  }

  function handleEdit(user: UserWithRelations) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleId,
      customerId: user.customerId || "",
      isActive: user.isActive,
    });

    setMessage("");
    setOpenForm(true);
  }

  async function refreshData() {
    const response = await fetch("/api/admin/users");
    const data = await response.json();

    if (response.ok) {
      setUsers(data.users);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const url = form.id ? `/api/admin/users/${form.id}` : "/api/admin/users";
    const method = form.id ? "PATCH" : "POST";

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password || undefined,
      roleId: form.roleId,
      customerId: form.customerId || null,
      isActive: form.isActive,
    };

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal menyimpan user");
      return;
    }

    setMessage(data.message || "User berhasil disimpan");
    setOpenForm(false);
    await refreshData();
  }

  async function handleDeactivate(user: UserWithRelations) {
    const confirmDelete = window.confirm(`Nonaktifkan user ${user.name}?`);

    if (!confirmDelete) return;

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Gagal menonaktifkan user");
      return;
    }

    await refreshData();
  }

  function handleResetPassword(user: UserWithRelations) {
    handleEdit(user);
    setTimeout(() => {
      alert("Isi password baru di form, lalu klik Simpan.");
    }, 100);
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
              placeholder="Cari user..."
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
              Tambah User
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
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    <p>{user.role.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {user.role.code}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {user.customer?.name || "-"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        user.isActive
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-600",
                      ].join(" ")}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => handleResetPassword(user)}
                        title="Reset Password"
                        aria-label="Reset Password"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50"
                      >
                        <KeyRound size={16} />
                      </button>

                      <button
                        onClick={() => handleEdit(user)}
                        title="Edit"
                        aria-label="Edit"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDeactivate(user)}
                        title="Nonaktifkan"
                        aria-label="Nonaktifkan"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-400/10"
                      >
                        <Ban size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    Data user belum ada.
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
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {form.id ? "Edit User" : "Tambah User"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {form.id
                    ? "Kosongkan password jika tidak ingin mengganti password."
                    : "Isi data akun login baru."}
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

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Nama
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="Nama user"
                  />
                </div>

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
                    placeholder="user@email.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500"
                    placeholder={
                      form.id
                        ? "Kosongkan jika tidak diganti"
                        : "Minimal 6 karakter"
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-600">
                    Role
                  </label>
                  <Select
                    value={form.roleId}
                    onChange={(value) => setForm({ ...form, roleId: value })}
                    options={roles.map((role) => ({ value: role.id, label: `${role.name} - ${role.code}` }))}
                    ariaLabel="Role"
                    buttonClassName="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">
                  Hubungkan ke Customer
                </label>
                <Select
                  value={form.customerId}
                  onChange={(value) => setForm({ ...form, customerId: value })}
                  options={[
                    { value: "", label: "Tidak terhubung ke customer" },
                    ...customers.map((customer) => ({
                      value: customer.id,
                      label: `${customer.name}${customer.company ? ` - ${customer.company}` : ""}`,
                    })),
                  ]}
                  ariaLabel="Hubungkan ke Customer"
                  buttonClassName="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 outline-none"
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
                User aktif
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
