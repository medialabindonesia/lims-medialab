"use client";

import { useMemo, useState } from "react";
import type { Customer, Role, User } from "@prisma/client";
import { KeyRound, Plus, RefreshCcw, Save, Search, X } from "lucide-react";

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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
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
              className="w-full rounded-2xl border border-white/10 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={refreshData}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCcw size={17} />
              Refresh
            </button>

            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              <Plus size={17} />
              Tambah User
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            {message}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-900 text-left text-slate-300">
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
                  className="border-t border-white/10 hover:bg-white/5"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                  </td>

                  <td className="px-5 py-4 text-slate-300">
                    <p>{user.role.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {user.role.code}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-300">
                    {user.customer?.name || "-"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        user.isActive
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-red-400/15 text-red-300",
                      ].join(" ")}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="mr-2 inline-flex items-center gap-1 rounded-xl border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300 transition hover:bg-emerald-400/10"
                    >
                      <KeyRound size={13} />
                      Reset Password
                    </button>

                    <button
                      onClick={() => handleEdit(user)}
                      className="mr-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeactivate(user)}
                      className="rounded-xl border border-red-400/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/10"
                    >
                      Nonaktifkan
                    </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
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
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Nama
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="Nama user"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="user@email.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder={
                      form.id
                        ? "Kosongkan jika tidak diganti"
                        : "Minimal 6 karakter"
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Role
                  </label>
                  <select
                    value={form.roleId}
                    onChange={(event) =>
                      setForm({ ...form, roleId: event.target.value })
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Hubungkan ke Customer
                </label>
                <select
                  value={form.customerId}
                  onChange={(event) =>
                    setForm({ ...form, customerId: event.target.value })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                >
                  <option value="">Tidak terhubung ke customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.company ? ` - ${customer.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                  className="h-4 w-4 accent-emerald-400"
                />
                User aktif
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenForm(false)}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/10"
              >
                Batal
              </button>

              <button
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
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