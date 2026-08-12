"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  Filter,
  FlaskConical,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  SearchCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Customer = {
  id: string;
  name: string;
  company?: string | null;
  customerCode?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Staff = { id: string; name: string; role: { name: string } };

type SurveyParameter = {
  id: string;
  parameterName: string;
  regulationName?: string | null;
  duration?: string | null;
};

type Survey = {
  id: string;
  surveyNo: string;
  status: string;
  scope: string;
  location?: string | null;
  scheduledAt?: string | null;
  resumeSummary?: string | null;
  assignedTo?: { name: string } | null;
  parameters: SurveyParameter[];
};

type Lead = {
  id: string;
  leadNo: string;
  status: string;
  capabilityStatus: string;
  requestedTests: string;
  customerKnowsScope: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt?: string;
  customer: Customer;
  surveys: Survey[];
  quotation?: { quotationNo: string; status: string } | null;
};

type LeadForm = {
  customerId: string;
  requestedTests: string;
  customerKnowsScope: boolean;
  capabilityStatus: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  source: string;
  note: string;
};

type SurveyDraft = {
  lead: Lead;
  scope: string;
  location: string;
  scheduledAt: string;
  assignedToId: string;
};

type ResumeDraft = {
  survey: Survey;
  resumeSummary: string;
  parametersText: string;
};

const emptyLeadForm: LeadForm = {
  customerId: "",
  requestedTests: "",
  customerKnowsScope: false,
  capabilityStatus: "PENDING",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  source: "",
  note: "",
};

const statusMeta: Record<string, { label: string; className: string }> = {
  NEW: { label: "Baru", className: "border-slate-200 bg-slate-50 text-slate-600" },
  QUALIFYING: { label: "Kualifikasi", className: "border-blue-200 bg-blue-50 text-blue-700" },
  SURVEY_REQUIRED: { label: "Perlu survey", className: "border-amber-200 bg-amber-50 text-amber-700" },
  SURVEY_IN_PROGRESS: { label: "Survey berjalan", className: "border-purple-200 bg-purple-50 text-purple-700" },
  READY_FOR_QUOTATION: { label: "Siap quotation", className: "border-green-200 bg-green-50 text-green-700" },
  QUOTATION_CREATED: { label: "Quotation dibuat", className: "border-blue-200 bg-blue-50 text-blue-700" },
  NOT_SUPPORTED: { label: "Tidak dapat dikerjakan", className: "border-red-200 bg-red-50 text-red-700" },
};

const capabilityLabels: Record<string, string> = {
  PENDING: "Belum dipastikan",
  SUPPORTED: "Mampu diuji",
  NEEDS_SURVEY: "Perlu survey",
  NOT_SUPPORTED: "Tidak mampu diuji",
};

function displayCustomer(customer: Customer) {
  return customer.company || customer.name;
}

function formatDate(value?: string | null) {
  if (!value) return "Belum dijadwalkan";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: string }) {
  const meta = statusMeta[status] || {
    label: status.replaceAll("_", " "),
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold", meta.className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {meta.label}
    </span>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
      {children} {required && <span className="text-red-500">*</span>}
    </span>
  );
}

function Dialog({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/35 p-2 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.985 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,42,73,0.24)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="workspace-icon-button h-9 w-9" aria-label="Tutup">
            <X size={17} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function LeadSurveyClient({
  initialLeads,
  customers,
  staff,
  viewerRole,
}: {
  initialLeads: Lead[];
  customers: Customer[];
  staff: Staff[];
  viewerRole: string;
}) {
  const canCreate = viewerRole !== "TECHNICAL";
  const [leads, setLeads] = useState(initialLeads);
  const [selectedId, setSelectedId] = useState(initialLeads[0]?.id || "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyLeadForm);
  const [surveyDraft, setSurveyDraft] = useState<SurveyDraft | null>(null);
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft | null>(null);

  const filteredLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
      const matchesQuery =
        !normalized ||
        `${lead.leadNo} ${displayCustomer(lead.customer)} ${lead.requestedTests}`
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);

  const selectedLead = leads.find((lead) => lead.id === selectedId) || filteredLeads[0] || null;
  const counts = {
    total: leads.length,
    survey: leads.filter((lead) => ["SURVEY_REQUIRED", "SURVEY_IN_PROGRESS"].includes(lead.status)).length,
    quotation: leads.filter((lead) => lead.status === "READY_FOR_QUOTATION").length,
    supported: leads.filter((lead) => lead.capabilityStatus === "SUPPORTED").length,
  };

  function chooseCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setForm((current) => ({
      ...current,
      customerId,
      contactName: customer?.contactPerson || "",
      contactEmail: customer?.email || "",
      contactPhone: customer?.phone || "",
    }));
  }

  async function refresh(preferredId?: string) {
    const response = await fetch("/api/marketing/leads");
    const data = await response.json();
    if (response.ok) {
      setLeads(data.leads);
      if (preferredId) setSelectedId(preferredId);
      else if (!data.leads.some((lead: Lead) => lead.id === selectedId)) {
        setSelectedId(data.leads[0]?.id || "");
      }
    }
  }

  async function createLead() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/marketing/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Gagal membuat lead");
        return;
      }
      setMessage(data.message);
      setLeads((current) => [data.lead, ...current]);
      setSelectedId(data.lead.id);
      setForm(emptyLeadForm);
      setShowLeadForm(false);
    } finally {
      setBusy(false);
    }
  }

  function openSurvey(lead: Lead) {
    setSurveyDraft({
      lead,
      scope: lead.requestedTests,
      location: "",
      scheduledAt: "",
      assignedToId: staff[0]?.id || "",
    });
  }

  async function createSurvey() {
    if (!surveyDraft) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/marketing/leads/${surveyDraft.lead.id}/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: surveyDraft.scope,
          location: surveyDraft.location,
          scheduledAt: surveyDraft.scheduledAt || null,
          assignedToId: surveyDraft.assignedToId,
        }),
      });
      const data = await response.json();
      setMessage(data.message || "");
      if (response.ok) {
        const leadId = surveyDraft.lead.id;
        setSurveyDraft(null);
        await refresh(leadId);
      }
    } finally {
      setBusy(false);
    }
  }

  function openResume(survey: Survey) {
    setResumeDraft({
      survey,
      resumeSummary: survey.resumeSummary || "",
      parametersText: survey.parameters.map((item) => item.parameterName).join("\n"),
    });
  }

  async function saveResume() {
    if (!resumeDraft) return;
    const parameters = resumeDraft.parametersText
      .split("\n")
      .map((name) => ({ parameterName: name.trim() }))
      .filter((item) => item.parameterName);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/marketing/surveys/${resumeDraft.survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESUME_READY",
          resumeSummary: resumeDraft.resumeSummary,
          parameters,
        }),
      });
      const data = await response.json();
      setMessage(data.message || "");
      if (response.ok) {
        setResumeDraft(null);
        await refresh(selectedId);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Marketing · Lead Intake"
        title="Lead & Survey"
        subtitle="Kualifikasi kebutuhan customer, koordinasikan survey, lalu teruskan scope yang sudah valid menjadi quotation."
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => setShowLeadForm(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 active:scale-[0.98]"
            >
              <Plus size={16} /> Lead baru
            </button>
          ) : undefined
        }
      />

      {message && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} /> {message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Tutup pesan" className="text-blue-500"><X size={15} /></button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          [Users, "Semua lead", counts.total, "Basis prospek aktif"],
          [MapPin, "Perlu survey", counts.survey, "Butuh validasi lapangan"],
          [FileCheck2, "Siap quotation", counts.quotation, "Scope sudah lengkap"],
          [FlaskConical, "Mampu diuji", counts.supported, "Capability terkonfirmasi"],
        ].map(([Icon, label, value, help]) => {
          const StatIcon = Icon as typeof Users;
          return (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,42,73,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><StatIcon size={17} /></span>
                <strong className="text-2xl font-black text-slate-900">{String(value)}</strong>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-700">{String(label)}</p>
              <p className="mt-1 truncate text-[10px] text-slate-400">{String(help)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,42,73,0.04)] xl:grid-cols-[minmax(24rem,0.92fr)_minmax(28rem,1.08fr)]">
        <div className="min-w-0 border-b border-slate-200 xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
            <label className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search size={15} className="text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari lead atau customer..." className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs outline-none focus:shadow-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Filter size={14} className="text-slate-400" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border-0 bg-transparent py-2 text-xs font-bold outline-none focus:shadow-none">
                <option value="ALL">Semua status</option>
                <option value="QUALIFYING">Kualifikasi</option>
                <option value="SURVEY_REQUIRED">Perlu survey</option>
                <option value="SURVEY_IN_PROGRESS">Survey berjalan</option>
                <option value="READY_FOR_QUOTATION">Siap quotation</option>
              </select>
            </label>
            <button type="button" onClick={() => refresh()} className="workspace-icon-button" aria-label="Muat ulang"><RefreshCcw size={15} /></button>
          </div>

          <div className="max-h-[48rem] overflow-y-auto p-2">
            {filteredLeads.length ? (
              filteredLeads.map((lead) => {
                const active = lead.id === selectedLead?.id;
                return (
                  <button
                    type="button"
                    key={lead.id}
                    onClick={() => setSelectedId(lead.id)}
                    className={cn(
                      "relative mb-1 w-full rounded-xl border px-3 py-3 text-left transition",
                      active
                        ? "border-blue-200 bg-blue-50/70"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {active && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-blue-600" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-800">{displayCustomer(lead.customer)}</p>
                          <ChevronRight size={14} className={active ? "text-blue-600" : "text-slate-300"} />
                        </div>
                        <p className="mt-1 font-mono text-[10px] font-bold text-blue-700">{lead.leadNo}</p>
                      </div>
                      <StatusPill status={lead.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{lead.requestedTests}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span className="truncate">PIC: {lead.contactName || "Belum diisi"}</span>
                      <span>{lead.surveys.length} survey</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-16 text-center">
                <Search size={24} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">Lead tidak ditemukan</p>
                <p className="mt-1 text-xs text-slate-400">Ubah pencarian atau filter status.</p>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 bg-slate-50/50">
          {selectedLead ? (
            <div>
              <div className="border-b border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700"><Building2 size={19} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">{displayCustomer(selectedLead.customer)}</h2>
                        <StatusPill status={selectedLead.status} />
                      </div>
                      <p className="mt-1 font-mono text-[11px] font-bold text-blue-700">{selectedLead.leadNo}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canCreate && selectedLead.status === "SURVEY_REQUIRED" && (
                      <button type="button" onClick={() => openSurvey(selectedLead)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100"><MapPin size={14} /> Buat survey</button>
                    )}
                    {selectedLead.status === "READY_FOR_QUOTATION" && (
                      <Link href={`/quotations/request/new?leadId=${selectedLead.id}&customerId=${selectedLead.customer.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-3 text-xs font-bold text-white transition hover:bg-blue-800"><ClipboardList size={14} /> Buat quotation</Link>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Contact person</p><p className="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-700"><UserRound size={13} className="text-blue-600" /> {selectedLead.contactName || "—"}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Email</p><p className="mt-1.5 flex items-center gap-2 truncate text-xs font-bold text-slate-700"><Mail size={13} className="text-blue-600" /> {selectedLead.contactEmail || "—"}</p></div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Telepon</p><p className="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-700"><Phone size={13} className="text-blue-600" /> {selectedLead.contactPhone || "—"}</p></div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Kebutuhan customer</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{selectedLead.requestedTests}</p>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">{capabilityLabels[selectedLead.capabilityStatus] || selectedLead.capabilityStatus}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Aktivitas survey</h3>
                    <p className="mt-1 text-[11px] text-slate-400">Handoff CS ke tim lapangan dan hasil rekomendasi teknis.</p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-600">{selectedLead.surveys.length}</span>
                </div>

                <div className="mt-3 space-y-3">
                  {selectedLead.surveys.length ? (
                    selectedLead.surveys.map((survey) => (
                      <article key={survey.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-[11px] font-black text-blue-700">{survey.surveyNo}</p>
                            <p className="mt-1 text-xs font-bold text-slate-700">{survey.scope}</p>
                          </div>
                          <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">{survey.status.replaceAll("_", " ")}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-y border-slate-100 py-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1.5"><MapPin size={12} /> {survey.location || "Lokasi belum diisi"}</span>
                          <span className="flex items-center gap-1.5"><CalendarDays size={12} /> {formatDate(survey.scheduledAt)}</span>
                          <span className="flex items-center gap-1.5"><UserRound size={12} /> {survey.assignedTo?.name || "Belum ditugaskan"}</span>
                        </div>
                        {survey.resumeSummary ? (
                          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
                            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-green-700"><CheckCircle2 size={13} /> Resume siap</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">{survey.resumeSummary}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {survey.parameters.map((item) => <span key={item.id} className="rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-800">{item.parameterName}</span>)}
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => openResume(survey)} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-blue-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><SearchCheck size={14} /> Isi Resume Survey</button>
                        )}
                      </article>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                      <Clock3 size={22} className="mx-auto text-slate-300" />
                      <p className="mt-2 text-xs font-bold text-slate-600">Belum ada aktivitas survey</p>
                      <p className="mt-1 text-[10px] text-slate-400">Survey hanya dibutuhkan jika scope customer belum cukup jelas.</p>
                    </div>
                  )}
                </div>

                {selectedLead.quotation && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                    <span className="flex items-center gap-2 text-xs font-bold text-green-800"><FileCheck2 size={15} /> {selectedLead.quotation.quotationNo} · {selectedLead.quotation.status}</span>
                    <ArrowRight size={15} className="text-green-700" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[30rem] items-center justify-center p-8 text-center">
              <div><ClipboardList size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Pilih lead untuk melihat detail</p></div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showLeadForm && (
          <Dialog title="Lead baru" subtitle="Catat customer, PIC, dan kebutuhan awal sebelum proses kualifikasi." onClose={() => setShowLeadForm(false)}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><FieldLabel required>Customer</FieldLabel><select value={form.customerId} onChange={(event) => chooseCustomer(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">Pilih customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerCode ? `${customer.customerCode} · ` : ""}{displayCustomer(customer)}</option>)}</select></label>
              <label><FieldLabel required>Nama contact person</FieldLabel><input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} placeholder="Nama PIC customer" className="w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
              <label><FieldLabel required>Email</FieldLabel><input value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} placeholder="nama@perusahaan.co.id" type="email" className="w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
              <label><FieldLabel required>Nomor kontak</FieldLabel><input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} placeholder="08..." className="w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
              <label><FieldLabel>Status kemampuan awal</FieldLabel><select value={form.capabilityStatus} onChange={(event) => setForm({ ...form, capabilityStatus: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="PENDING">Belum dipastikan</option><option value="SUPPORTED">Medialab mampu</option><option value="NEEDS_SURVEY">Perlu survey</option><option value="NOT_SUPPORTED">Tidak mampu</option></select></label>
              <label className="sm:col-span-2"><FieldLabel required>Kebutuhan pengujian</FieldLabel><textarea value={form.requestedTests} onChange={(event) => setForm({ ...form, requestedTests: event.target.value })} placeholder="Jelaskan sample, parameter, lokasi, atau tujuan pengujian yang disampaikan customer..." className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2"><input type="checkbox" checked={form.customerKnowsScope} onChange={(event) => setForm({ ...form, customerKnowsScope: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300" /><span><span className="block text-xs font-bold text-slate-700">Customer sudah memahami parameter dan scope</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">Jika belum, sistem akan mengarahkan lead ke proses survey.</span></span></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setShowLeadForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Batal</button><button type="button" disabled={busy} onClick={createLead} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan lead"}</button></div>
          </Dialog>
        )}

        {surveyDraft && (
          <Dialog title="Rekomendasikan survey" subtitle={`${surveyDraft.lead.leadNo} · ${displayCustomer(surveyDraft.lead.customer)}`} onClose={() => setSurveyDraft(null)}>
            <div className="space-y-4 p-5">
              <label><FieldLabel required>Scope survey</FieldLabel><textarea value={surveyDraft.scope} onChange={(event) => setSurveyDraft({ ...surveyDraft, scope: event.target.value })} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><FieldLabel>Lokasi</FieldLabel><input value={surveyDraft.location} onChange={(event) => setSurveyDraft({ ...surveyDraft, location: event.target.value })} placeholder="Alamat / area survey" className="w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
                <label><FieldLabel>Jadwal</FieldLabel><input type="datetime-local" value={surveyDraft.scheduledAt} onChange={(event) => setSurveyDraft({ ...surveyDraft, scheduledAt: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
              </div>
              <label><FieldLabel required>Pelaksana survey</FieldLabel><select value={surveyDraft.assignedToId} onChange={(event) => setSurveyDraft({ ...surveyDraft, assignedToId: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">Pilih pelaksana</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role.name}</option>)}</select></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setSurveyDraft(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Batal</button><button type="button" disabled={busy} onClick={createSurvey} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Buat survey"}</button></div>
          </Dialog>
        )}

        {resumeDraft && (
          <Dialog title="Resume Survey" subtitle={`${resumeDraft.survey.surveyNo} · hasil ini akan menjadi dasar quotation`} onClose={() => setResumeDraft(null)}>
            <div className="space-y-4 p-5">
              <label><FieldLabel required>Ringkasan kondisi dan rekomendasi</FieldLabel><textarea value={resumeDraft.resumeSummary} onChange={(event) => setResumeDraft({ ...resumeDraft, resumeSummary: event.target.value })} placeholder="Tuliskan kondisi lokasi, kebutuhan sampling, dan rekomendasi teknis..." className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
              <label><FieldLabel required>Parameter rekomendasi</FieldLabel><textarea value={resumeDraft.parametersText} onChange={(event) => setResumeDraft({ ...resumeDraft, parametersText: event.target.value })} placeholder={"Satu parameter per baris\nContoh: pH\nTSS\nBOD"} className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm" /><span className="mt-1.5 block text-[10px] text-slate-400">Gunakan satu baris untuk setiap parameter agar mudah diperiksa.</span></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setResumeDraft(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Batal</button><button type="button" disabled={busy} onClick={saveResume} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan resume"}</button></div>
          </Dialog>
        )}
      </AnimatePresence>
    </section>
  );
}
