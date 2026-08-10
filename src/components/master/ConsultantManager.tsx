"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";

type Consultant = {
  id: string;
  code: string;
  name: string;
  company?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function ConsultantManager({ initialConsultants }: { initialConsultants: Consultant[] }) {
  const [consultants, setConsultants] = useState(initialConsultants);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", company: "", contactPerson: "", email: "", phone: "" });

  async function save() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/master/consultants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.message || "Gagal menyimpan consultant");
    setConsultants((current) => [...current, data.consultant]);
    setForm({ name: "", company: "", contactPerson: "", email: "", phone: "" });
    setMessage(data.message);
    setOpen(false);
  }

  return (
    <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-black text-slate-900"><Building2 size={18} /> Master Consultant</p>
          <p className="mt-1 text-sm text-slate-500">ID consultant dibuat otomatis 3 digit dan dapat mengikat banyak tenant/customer.</p>
        </div>
        <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">
          <Plus size={16} /> Daftarkan Consultant
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-5">
          {(["name", "company", "contactPerson", "email", "phone"] as const).map((key) => (
            <input
              key={key}
              value={form[key]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={{ name: "Nama consultant *", company: "Perusahaan", contactPerson: "Contact person", email: "Email", phone: "Nomor kontak" }[key]}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
          ))}
          <button disabled={busy} onClick={save} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan"}</button>
          {message ? <p className="self-center text-sm text-slate-600 md:col-span-4">{message}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {consultants.length ? consultants.map((item) => (
          <span key={item.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <strong className="font-mono text-cyan-700">{item.code}</strong> · {item.name}
          </span>
        )) : <p className="text-sm text-slate-400">Belum ada consultant.</p>}
      </div>
    </div>
  );
}
