"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, MapPinned, Plus, RefreshCcw, SearchCheck } from "lucide-react";

type Customer = {
  id: string; name: string; company?: string | null; customerCode?: string | null;
  contactPerson?: string | null; email?: string | null; phone?: string | null;
};
type Staff = { id: string; name: string; role: { name: string } };
type Survey = {
  id: string; surveyNo: string; status: string; scope: string; location?: string | null;
  resumeSummary?: string | null; assignedTo?: { name: string } | null;
  parameters: Array<{ id: string; parameterName: string; regulationName?: string | null; duration?: string | null }>;
};
type Lead = {
  id: string; leadNo: string; status: string; capabilityStatus: string; requestedTests: string;
  customerKnowsScope: boolean; contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null;
  customer: Customer; surveys: Survey[]; quotation?: { quotationNo: string; status: string } | null;
};

const capabilityLabels: Record<string, string> = {
  PENDING: "Belum dipastikan", SUPPORTED: "Mampu diuji", NEEDS_SURVEY: "Perlu survey", NOT_SUPPORTED: "Tidak mampu diuji",
};

export default function LeadSurveyClient({ initialLeads, customers, staff, viewerRole }: { initialLeads: Lead[]; customers: Customer[]; staff: Staff[]; viewerRole: string }) {
  const canCreate = viewerRole !== "TECHNICAL";
  const [leads, setLeads] = useState(initialLeads);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ customerId: "", requestedTests: "", customerKnowsScope: false, capabilityStatus: "PENDING", contactName: "", contactEmail: "", contactPhone: "", source: "", note: "" });

  function chooseCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setForm((current) => ({ ...current, customerId, contactName: customer?.contactPerson || "", contactEmail: customer?.email || "", contactPhone: customer?.phone || "" }));
  }
  async function refresh() {
    const response = await fetch("/api/marketing/leads");
    const data = await response.json();
    if (response.ok) setLeads(data.leads);
  }
  async function createLead() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/marketing/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.message || "Gagal membuat lead");
    setMessage(data.message); setLeads((current) => [data.lead, ...current]);
    setForm({ customerId: "", requestedTests: "", customerKnowsScope: false, capabilityStatus: "PENDING", contactName: "", contactEmail: "", contactPhone: "", source: "", note: "" });
  }
  async function createSurvey(lead: Lead) {
    const scope = window.prompt("Scope survey yang direkomendasikan CS:", lead.requestedTests);
    if (!scope) return;
    const location = window.prompt("Lokasi survey:", "") || "";
    const assignedToId = window.prompt(`ID pelaksana survey:\n${staff.map((item) => `${item.id} — ${item.name} (${item.role.name})`).join("\n")}`, staff[0]?.id || "");
    if (!assignedToId) return;
    const response = await fetch(`/api/marketing/leads/${lead.id}/surveys`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, location, assignedToId }) });
    const data = await response.json(); setMessage(data.message || ""); await refresh();
  }
  async function saveResume(survey: Survey) {
    const resumeSummary = window.prompt("Resume hasil survey (kondisi lokasi dan rekomendasi):", survey.resumeSummary || "");
    if (!resumeSummary) return;
    const raw = window.prompt("Parameter hasil survey, pisahkan dengan koma:", survey.parameters.map((item) => item.parameterName).join(", "));
    if (!raw) return;
    const parameters = raw.split(",").map((name) => ({ parameterName: name.trim() })).filter((item) => item.parameterName);
    const response = await fetch(`/api/marketing/surveys/${survey.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RESUME_READY", resumeSummary, parameters }) });
    const data = await response.json(); setMessage(data.message || ""); await refresh();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-cyan-600">Marketing Intake</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900">Lead & Survey</h1>
        <p className="mt-2 text-slate-500">CS mencatat kebutuhan dan identitas, memastikan kemampuan Medialab, lalu merekomendasikan survey bila scope customer belum jelas.</p>
      </div>

      {canCreate ? <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Plus size={19} /> Lead Baru</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select value={form.customerId} onChange={(event) => chooseCustomer(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Pilih customer *</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerCode ? `${customer.customerCode} · ` : ""}{customer.company || customer.name}</option>)}</select>
          <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Nama contact person *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
          <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="Email *" type="email" className="rounded-xl border border-slate-200 px-3 py-2.5" />
          <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Nomor kontak *" className="rounded-xl border border-slate-200 px-3 py-2.5" />
          <textarea value={form.requestedTests} onChange={(e) => setForm({ ...form, requestedTests: e.target.value })} placeholder="Mau menguji apa? *" className="min-h-24 rounded-xl border border-slate-200 px-3 py-2.5 md:col-span-2" />
          <select value={form.capabilityStatus} onChange={(e) => setForm({ ...form, capabilityStatus: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="PENDING">Belum dipastikan</option><option value="SUPPORTED">Medialab mampu</option><option value="NEEDS_SURVEY">Perlu survey</option><option value="NOT_SUPPORTED">Tidak mampu</option></select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><input type="checkbox" checked={form.customerKnowsScope} onChange={(e) => setForm({ ...form, customerKnowsScope: e.target.checked })} /> Customer sudah tahu parameter</label>
        </div>
        <button disabled={busy} onClick={createLead} className="mt-4 rounded-xl bg-cyan-600 px-5 py-2.5 font-bold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan Lead"}</button>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div> : null}

      <div className="flex items-center justify-between"><h2 className="text-xl font-black text-slate-900">Daftar Lead</h2><button onClick={refresh} className="flex items-center gap-2 text-sm font-bold text-slate-600"><RefreshCcw size={15} /> Refresh</button></div>
      <div className="grid gap-4">
        {leads.map((lead) => (
          <article key={lead.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="font-mono text-sm font-black text-cyan-700">{lead.leadNo}</p><h3 className="mt-1 text-xl font-black text-slate-900">{lead.customer.company || lead.customer.name}</h3><p className="mt-2 text-sm text-slate-600">{lead.requestedTests}</p></div>
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{lead.status}</span><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{capabilityLabels[lead.capabilityStatus] || lead.capabilityStatus}</span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canCreate && lead.status === "SURVEY_REQUIRED" ? <button onClick={() => createSurvey(lead)} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white"><MapPinned size={15} /> Rekomendasikan Survey</button> : null}
              {lead.status === "READY_FOR_QUOTATION" ? <Link href={`/quotations/request/new?leadId=${lead.id}&customerId=${lead.customer.id}`} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><ClipboardList size={15} /> Buat Quotation</Link> : null}
              {lead.quotation ? <span className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700">{lead.quotation.quotationNo} · {lead.quotation.status}</span> : null}
            </div>
            {lead.surveys.map((survey) => (
              <div key={survey.id} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap justify-between gap-2"><p className="font-mono text-sm font-black text-amber-800">{survey.surveyNo} · {survey.status}</p><p className="text-xs text-slate-500">Pelaksana: {survey.assignedTo?.name || "-"}</p></div>
                <p className="mt-2 text-sm text-slate-700">{survey.scope}</p>
                {survey.resumeSummary ? <p className="mt-2 rounded-xl bg-white p-3 text-sm text-slate-600"><strong>Resume:</strong> {survey.resumeSummary}<br /><strong>Parameter:</strong> {survey.parameters.map((item) => item.parameterName).join(", ")}</p> : <button onClick={() => saveResume(survey)} className="mt-3 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><SearchCheck size={15} /> Isi Resume Survey</button>}
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
