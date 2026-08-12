"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Command,
  FileCheck2,
  FileText,
  Filter,
  FlaskConical,
  Headphones,
  LayoutDashboard,
  ListChecks,
  Mail,
  MapPin,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  UserRound,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";

type ConceptId = "guided" | "desk" | "dealroom";

type Parameter = {
  id: string;
  name: string;
  method: string;
  duration: string;
  accredited: boolean;
};

const parameters: Parameter[] = [
  {
    id: "so2",
    name: "Sulfur Dioksida (SO₂)",
    method: "SNI 7119.7:2017",
    duration: "24 Jam",
    accredited: true,
  },
  {
    id: "no2",
    name: "Nitrogen Dioksida (NO₂)",
    method: "SNI 7119.2:2017",
    duration: "1 Jam",
    accredited: true,
  },
  {
    id: "pm25",
    name: "Partikulat PM2.5",
    method: "SNI 7119.14:2016",
    duration: "24 Jam",
    accredited: true,
  },
  {
    id: "co",
    name: "Karbon Monoksida (CO)",
    method: "IK-MML-UDR-04",
    duration: "8 Jam",
    accredited: false,
  },
  {
    id: "tsp",
    name: "Total Suspended Particulate",
    method: "SNI 7119.3:2017",
    duration: "24 Jam",
    accredited: true,
  },
];

const conceptOptions: Array<{
  id: ConceptId;
  number: string;
  label: string;
  caption: string;
  bestFor: string;
}> = [
  {
    id: "guided",
    number: "01",
    label: "Guided Flow",
    caption: "Tenang, jelas, minim salah input",
    bestFor: "Staf baru & proses terstandar",
  },
  {
    id: "desk",
    number: "02",
    label: "Sales Desk",
    caption: "Padat, cepat, semua terlihat",
    bestFor: "Sales berpengalaman & volume tinggi",
  },
  {
    id: "dealroom",
    number: "03",
    label: "Deal Room",
    caption: "Customer-centric dari lead ke deal",
    bestFor: "Key account & penawaran kompleks",
  },
];

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function ConceptPill({
  active,
  option,
  onClick,
}: {
  active: boolean;
  option: (typeof conceptOptions)[number];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group min-w-[15rem] flex-1 rounded-2xl border p-3 text-left transition-all duration-200 sm:p-4",
        active
          ? "border-blue-500 bg-blue-600 text-white shadow-[0_14px_30px_rgba(17,77,165,0.24)]"
          : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-black",
            active ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"
          )}
        >
          {option.number}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black sm:text-base">{option.label}</span>
          <span
            className={cn(
              "mt-0.5 block text-xs leading-5",
              active ? "text-blue-100" : "text-slate-500"
            )}
          >
            {option.caption}
          </span>
        </span>
      </div>
    </button>
  );
}

function PreviewBar({
  label,
  tone = "light",
}: {
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] sm:px-6",
        tone === "dark"
          ? "border-white/10 bg-[#051c43] text-blue-200"
          : "border-slate-200 bg-slate-50 text-slate-500"
      )}
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
        Interactive prototype
      </span>
      <span>{label}</span>
    </div>
  );
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border",
          inverse
            ? "border-white/15 bg-white/10"
            : "border-blue-100 bg-blue-50"
        )}
      >
        <FlaskConical
          size={20}
          className={inverse ? "text-sky-300" : "text-blue-700"}
        />
      </div>
      <div>
        <p
          className={cn(
            "text-sm font-black tracking-[-0.02em]",
            inverse ? "text-white" : "text-slate-900"
          )}
        >
          MEDIALAB
        </p>
        <p
          className={cn(
            "text-[9px] font-bold uppercase tracking-[0.22em]",
            inverse ? "text-blue-200" : "text-slate-400"
          )}
        >
          Marketing OS
        </p>
      </div>
    </div>
  );
}

function ParameterToggle({
  parameter,
  selected,
  onToggle,
  compact = false,
  dark = false,
}: {
  parameter: Parameter;
  selected: boolean;
  onToggle: () => void;
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left transition-colors",
        compact ? "px-3 py-2.5" : "rounded-2xl border p-3.5",
        dark
          ? selected
            ? "border-sky-400/40 bg-sky-400/10"
            : "border-white/10 bg-white/[0.025] hover:bg-white/[0.06]"
          : selected
            ? "border-blue-200 bg-blue-50/70"
            : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
            selected
              ? "border-blue-600 bg-blue-600 text-white"
              : dark
                ? "border-white/30 text-transparent"
                : "border-slate-300 text-transparent"
          )}
        >
          <Check size={12} strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block font-bold",
              compact ? "text-xs" : "text-sm",
              dark ? "text-white" : "text-slate-800"
            )}
          >
            {parameter.name}
          </span>
          <span
            className={cn(
              "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]",
              dark ? "text-blue-200" : "text-slate-500"
            )}
          >
            <span>{parameter.method}</span>
            <span aria-hidden="true">•</span>
            <span>{parameter.duration}</span>
          </span>
        </span>
        {parameter.accredited && (
          <BadgeCheck
            size={16}
            className={dark ? "text-lime-300" : "text-lime-600"}
          />
        )}
      </div>
    </button>
  );
}

function GuidedFlow({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [step, setStep] = useState(2);
  const steps = ["Customer", "Ruang lingkup", "Harga & syarat", "Review"];
  const selectedCount = selectedIds.length;
  const estimate = selectedCount * 1_750_000 * 2;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#f4f7fb] shadow-[0_30px_80px_rgba(7,43,107,0.12)]">
      <PreviewBar label="Concept 01 · Guided Flow" />

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <BrandMark />
        <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 lg:flex">
          {steps.map((item, index) => {
            const number = index + 1;
            const active = number === step;
            const complete = number < step;
            return (
              <button
                type="button"
                key={item}
                onClick={() => setStep(number)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-colors",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : complete
                      ? "text-blue-700"
                      : "text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                    active
                      ? "bg-white/20"
                      : complete
                        ? "bg-blue-100"
                        : "bg-slate-200"
                  )}
                >
                  {complete ? <Check size={11} /> : number}
                </span>
                <span className="hidden xl:inline">{item}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-right sm:block">
            <span className="block text-xs font-bold text-slate-800">Dinda Prameswari</span>
            <span className="block text-[10px] text-slate-400">Sales Executive</span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-xs font-black text-white">
            DP
          </span>
        </div>
      </header>

      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-blue-700 via-sky-400 to-lime-400 transition-all"
          style={{ width: `${step * 25}%` }}
        />
      </div>

      <main className="mx-auto max-w-[78rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-700">
              <span>Quotation Baru</span>
              <ChevronRight size={13} />
              <span>MI.QT.001.26081302</span>
            </div>
            <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
              Susun ruang lingkup pengujian
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Kami sudah membawa data customer dari Lead. Anda cukup memilih layanan yang dibutuhkan.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-50 px-3 py-2 text-xs font-bold text-lime-800">
            <CheckCircle2 size={14} /> Tersimpan otomatis
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(7,43,107,0.05)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Building2 size={19} />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Customer terpilih</p>
                    <h3 className="mt-1 font-black text-slate-900">PT Aurora Manufacturing Indonesia</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Karawang · Siti Rahmawati · DC.001.2600421</p>
                  </div>
                </div>
                <button type="button" className="rounded-xl px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">
                  Ganti customer
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Matriks", "Ambient Air Quality"],
                  ["Regulasi", "PP No. 22 Tahun 2021"],
                  ["Lokasi", "Area Produksi · 2 titik"],
                ].map(([label, value]) => (
                  <button
                    type="button"
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                    <span className="mt-1.5 flex items-start justify-between gap-2 text-xs font-bold text-slate-800">
                      {value} <ChevronDown size={14} className="shrink-0 text-slate-400" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(7,43,107,0.05)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600">Parameter tersedia</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">Pilih yang masuk penawaran</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {selectedCount} dipilih
                  </span>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
                    <Filter size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
                {parameters.map((parameter) => (
                  <ParameterToggle
                    key={parameter.id}
                    parameter={parameter}
                    selected={selectedIds.includes(parameter.id)}
                    onToggle={() => onToggle(parameter.id)}
                  />
                ))}
              </div>

              <button type="button" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 py-3 text-xs font-bold text-blue-700">
                <Plus size={15} /> Tambah regulasi lain ke paket ini
              </button>
            </div>
          </section>

          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-blue-900/10 bg-[#082c68] text-white shadow-[0_24px_50px_rgba(7,43,107,0.22)]">
              <div className="border-b border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-200">Ringkasan live</p>
                  <FileText size={17} className="text-sky-300" />
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200">Estimasi pekerjaan</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.03em]">{formatRupiah(estimate)}</p>
                <p className="mt-1 text-[11px] text-blue-200">Belum termasuk PPN & biaya sampling</p>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-200">Kelengkapan</span>
                  <span className="font-black">68%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-sky-300 to-lime-300" />
                </div>

                <div className="space-y-3 border-y border-white/10 py-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-blue-100"><PackageCheck size={14} /> Paket pengujian</span>
                    <strong>1</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-blue-100"><ListChecks size={14} /> Parameter</span>
                    <strong>{selectedCount}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-blue-100"><MapPin size={14} /> Titik sampling</span>
                    <strong>2</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-blue-100"><Timer size={14} /> TAT</span>
                    <strong>Normal · 10 hari</strong>
                  </div>
                </div>

                <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-lime-200">
                    <ShieldCheck size={15} /> Validasi regulasi aktif
                  </p>
                  <p className="mt-1.5 text-[10px] leading-4 text-blue-100">
                    Durasi yang tidak sesuai baku mutu otomatis disembunyikan.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-5 flex flex-col-reverse justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
            <ArrowLeft size={16} /> Kembali
          </button>
          <button
            type="button"
            onClick={() => setStep(Math.min(4, step + 1))}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(17,77,165,0.25)] hover:bg-blue-700"
          >
            Lanjut ke harga & syarat <ArrowRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}

function SalesDesk({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredParameters = parameters.filter((parameter) =>
    parameter.name.toLowerCase().includes(query.toLowerCase())
  );
  const subtotal = selectedIds.length * 1_750_000 * 2;
  const total = subtotal * 1.11;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#163d76] bg-[#061735] shadow-[0_34px_90px_rgba(4,20,47,0.32)]">
      <PreviewBar label="Concept 02 · Sales Desk" tone="dark" />

      <div className="flex min-h-[760px] text-white">
        <aside className="hidden w-[4.5rem] shrink-0 flex-col items-center border-r border-white/10 bg-[#04142f] py-5 lg:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400 text-[#04142f]">
            <FlaskConical size={20} />
          </span>
          <nav className="mt-10 flex flex-1 flex-col gap-3" aria-label="Preview navigation">
            {[
              [LayoutDashboard, false],
              [Target, false],
              [FileText, true],
              [Users, false],
              [BarChart3, false],
            ].map(([Icon, active], index) => {
              const NavIcon = Icon as typeof LayoutDashboard;
              return (
                <button
                  type="button"
                  key={index}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-white/12 text-sky-300" : "text-blue-300/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <NavIcon size={18} />
                </button>
              );
            })}
          </nav>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-lime-300 to-sky-300 text-xs font-black text-[#04142f]">DP</span>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex min-h-[4.5rem] items-center justify-between gap-4 border-b border-white/10 bg-[#061b3d] px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-blue-200 lg:hidden">
                <Menu size={17} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">Quotation Workspace</p>
                <p className="truncate text-[10px] text-blue-200">MI.QT.001.26081302 · Draft tersimpan 14:32</p>
              </div>
            </div>
            <div className="hidden min-w-[16rem] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 md:flex">
              <Search size={14} className="text-blue-300" />
              <span className="flex-1 text-xs text-blue-200">Cari customer, regulasi, parameter...</span>
              <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-blue-300">⌘ K</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-blue-100 sm:block">Simpan draft</button>
              <button type="button" className="rounded-xl bg-lime-400 px-3 py-2 text-xs font-black text-[#092451] shadow-[0_10px_25px_rgba(111,188,29,0.2)]">Ajukan verifikasi</button>
            </div>
          </header>

          <div className="grid min-h-[688px] xl:grid-cols-[15.5rem_minmax(0,1fr)_19rem]">
            <aside className="border-b border-white/10 bg-[#071f48] p-4 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Deal context</p>
                <button type="button" className="text-blue-300"><PanelLeftClose size={15} /></button>
              </div>

              <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-300/[0.07] p-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-300/15 text-sky-300"><Building2 size={15} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">PT Aurora Manufacturing</p>
                    <p className="text-[9px] text-blue-200">DC.001.2600421</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-[10px] text-blue-100">
                  <p className="flex items-center gap-2"><UserRound size={12} className="text-sky-300" /> Siti Rahmawati</p>
                  <p className="flex items-center gap-2"><Mail size={12} className="text-sky-300" /> siti@aurora.co.id</p>
                  <p className="flex items-center gap-2"><MapPin size={12} className="text-sky-300" /> Karawang, Jawa Barat</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-300">Progress dokumen</p>
                <ol className="mt-3 space-y-1">
                  {[
                    ["Customer & PIC", true],
                    ["Scope pengujian", true],
                    ["Lokasi & jumlah", true],
                    ["Pricing", false],
                    ["Terms & review", false],
                  ].map(([label, complete], index) => (
                    <li key={String(label)} className="flex items-center gap-2 py-2 text-[11px]">
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-md", complete ? "bg-lime-400/15 text-lime-300" : index === 3 ? "bg-sky-300/15 text-sky-300" : "bg-white/5 text-blue-300/40")}>
                        {complete ? <Check size={11} /> : index + 1}
                      </span>
                      <span className={complete || index === 3 ? "font-bold text-white" : "text-blue-300/55"}>{String(label)}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-3">
                <p className="flex items-center gap-2 text-[10px] font-bold text-amber-200"><Zap size={13} /> Dari Resume Survey</p>
                <p className="mt-1.5 text-[10px] leading-4 text-blue-100">4 parameter dan 2 lokasi sudah di-prefill. Tidak perlu input ulang.</p>
              </div>
            </aside>

            <section className="min-w-0 bg-[#081d40] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-sky-300">
                    <span>Paket 01</span><ChevronRight size={12} /><span>Ambient Air</span>
                  </div>
                  <h2 className="mt-1.5 text-xl font-black tracking-[-0.025em]">Outdoor Ambient Air Quality</h2>
                  <p className="mt-1 text-[11px] text-blue-200">PP No. 22 Tahun 2021 · Lampiran VII</p>
                </div>
                <button type="button" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-blue-100">
                  <Plus size={13} /> Paket baru
                </button>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button type="button" className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left">
                  <span className="text-[9px] uppercase tracking-[0.12em] text-blue-300">Lokasi</span>
                  <span className="mt-1 flex items-center justify-between text-[11px] font-bold">Area Produksi <ChevronDown size={13} /></span>
                </button>
                <button type="button" className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left">
                  <span className="text-[9px] uppercase tracking-[0.12em] text-blue-300">Jumlah titik</span>
                  <span className="mt-1 flex items-center justify-between text-[11px] font-bold">2 titik <ChevronDown size={13} /></span>
                </button>
                <button type="button" className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left">
                  <span className="text-[9px] uppercase tracking-[0.12em] text-blue-300">TAT</span>
                  <span className="mt-1 flex items-center justify-between text-[11px] font-bold">Normal · 10 hari <ChevronDown size={13} /></span>
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#071a3b]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3">
                  <label className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Search size={13} className="text-blue-300" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Filter parameter..."
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-white outline-none placeholder:text-blue-300/50 focus:shadow-none"
                    />
                  </label>
                  <span className="rounded-lg bg-sky-300/10 px-2.5 py-2 text-[10px] font-bold text-sky-200">{selectedIds.length} / {parameters.length} dipilih</span>
                </div>
                <div className="divide-y divide-white/[0.07]">
                  {filteredParameters.map((parameter) => (
                    <ParameterToggle
                      key={parameter.id}
                      parameter={parameter}
                      selected={selectedIds.includes(parameter.id)}
                      onToggle={() => onToggle(parameter.id)}
                      compact
                      dark
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem]">
                <label className="block rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-300">Nama paket di quotation</span>
                  <input defaultValue="Pengujian Kualitas Udara Ambien" className="mt-1 w-full border-0 bg-transparent p-0 text-xs font-bold text-white outline-none focus:shadow-none" />
                </label>
                <label className="block rounded-xl border border-sky-300/30 bg-sky-300/[0.06] p-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-sky-300">Harga paket / titik</span>
                  <span className="mt-1 flex items-center gap-1 text-xs font-black"><span className="text-[9px] text-blue-300">Rp</span> 8.750.000</span>
                </label>
              </div>
            </section>

            <aside className="border-t border-white/10 bg-[#071f48] p-4 xl:border-l xl:border-t-0">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-300">Commercial summary</p>
                <MoreHorizontal size={16} className="text-blue-300" />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-[9px] uppercase tracking-[0.12em] text-blue-300">Nilai penawaran</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.04em]">{formatRupiah(total)}</p>
                <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4 text-[11px]">
                  <div className="flex justify-between text-blue-100"><span>Jasa pengujian</span><span>{formatRupiah(subtotal)}</span></div>
                  <div className="flex justify-between text-blue-100"><span>Biaya sampling</span><span>Rp0</span></div>
                  <div className="flex justify-between text-blue-100"><span>Diskon</span><span>− Rp0</span></div>
                  <div className="flex justify-between font-bold text-white"><span>PPN 11%</span><span>{formatRupiah(total - subtotal)}</span></div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left">
                  <span><span className="block text-[9px] text-blue-300">Masa berlaku</span><span className="mt-0.5 block text-xs font-bold">30 hari</span></span>
                  <CalendarDays size={15} className="text-sky-300" />
                </button>
                <button type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left">
                  <span><span className="block text-[9px] text-blue-300">Pembayaran</span><span className="mt-0.5 block text-xs font-bold">30 hari setelah invoice</span></span>
                  <CircleDollarSign size={15} className="text-sky-300" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-lime-300/20 bg-lime-300/[0.07] p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-lime-300" />
                  <div>
                    <p className="text-[10px] font-bold text-lime-200">Siap dilanjutkan</p>
                    <p className="mt-1 text-[9px] leading-4 text-blue-100">Data teknis lengkap. Isi payment term untuk mengajukan verifikasi.</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[9px] text-blue-300/70">
                <Command size={12} /><span>⌘ Enter untuk simpan · ⌘ P untuk preview</span>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealRoom({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [showSuggestion, setShowSuggestion] = useState(true);
  const total = selectedIds.length * 3_885_000;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#dce2e8] bg-[#f7f5f0] shadow-[0_30px_80px_rgba(33,43,55,0.12)]">
      <PreviewBar label="Concept 03 · Deal Room" />

      <header className="flex items-center justify-between gap-4 border-b border-[#dce2e8] bg-[#fbfaf7] px-4 py-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-xs font-bold text-slate-500 lg:flex" aria-label="Preview navigation">
          <button type="button" className="text-slate-950">Deals</button>
          <button type="button">Accounts</button>
          <button type="button">Schedule</button>
          <button type="button">Reports</button>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" className="hidden h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 sm:flex"><Headphones size={14} /> Bantuan</button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#102a43] text-xs font-black text-white">DP</span>
        </div>
      </header>

      <main className="mx-auto max-w-[80rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
          <span>Deals</span><ChevronRight size={12} /><span>PT Aurora Manufacturing</span><ChevronRight size={12} /><span className="text-slate-900">Quotation</span>
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#102a43] text-white shadow-[0_12px_24px_rgba(16,42,67,0.18)]"><Building2 size={21} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-[-0.035em] text-[#102a43] sm:text-3xl">PT Aurora Manufacturing</h2>
                <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-black text-lime-800">QUALIFIED</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Environmental compliance 2026 · Karawang Plant</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700"><MessageSquareText size={14} /> Catatan</button>
            <button type="button" className="flex h-10 items-center gap-2 rounded-xl bg-[#102a43] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(16,42,67,0.18)]"><FileCheck2 size={14} /> Review quotation</button>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_18.5rem]">
          <aside>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Customer journey</p>
            <ol className="mt-4">
              {[
                ["Lead masuk", "12 Agu · 09:14", true],
                ["Kebutuhan valid", "12 Agu · 11:30", true],
                ["Survey selesai", "13 Agu · 13:40", true],
                ["Quotation", "Sedang disusun", false],
                ["Approval", "Berikutnya", false],
              ].map(([label, meta, complete], index) => (
                <li key={String(label)} className="relative flex gap-3 pb-6 last:pb-0">
                  {index < 4 && <span className={cn("absolute left-[9px] top-5 h-full w-px", complete ? "bg-lime-400" : "bg-slate-300")} />}
                  <span className={cn("relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2", complete ? "border-lime-500 bg-lime-500 text-white" : index === 3 ? "border-[#102a43] bg-[#f7f5f0] text-[#102a43]" : "border-slate-300 bg-[#f7f5f0] text-transparent")}>
                    {complete ? <Check size={10} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <span>
                    <span className={cn("block text-[11px] font-black", complete || index === 3 ? "text-slate-800" : "text-slate-400")}>{String(label)}</span>
                    <span className="mt-0.5 block text-[9px] text-slate-400">{String(meta)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </aside>

          <section className="min-w-0 space-y-4">
            {showSuggestion && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e7f1e0] to-[#edf5ea] p-5 ring-1 ring-lime-700/10">
                <button type="button" onClick={() => setShowSuggestion(false)} aria-label="Tutup rekomendasi" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-lime-900/50 hover:bg-white/50"><X size={15} /></button>
                <div className="flex gap-3 pr-8">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime-700 text-white"><WandSparkles size={18} /></span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-lime-800">Smart handoff</p>
                    <h3 className="mt-1 text-base font-black text-[#173821]">Resume survey sudah menjadi draft scope</h3>
                    <p className="mt-1 text-xs leading-5 text-[#49644e]">4 parameter, 2 titik sampling, dan PP No. 22/2021 telah dicocokkan dengan katalog resmi. Periksa, lalu tetapkan harga paket.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-[#dce2e8] bg-white p-4 shadow-[0_14px_35px_rgba(16,42,67,0.05)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#13738a]">Recommended scope</p>
                  <h3 className="mt-1 text-lg font-black tracking-[-0.02em] text-[#102a43]">Kualitas Udara Ambien · Area Produksi</h3>
                </div>
                <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[#fafbfc] px-3 py-2 text-[11px] font-bold text-slate-600"><MapPin size={13} /> 2 titik</button>
              </div>

              <div className="mt-4 rounded-2xl bg-[#f7f8fa] p-3">
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <div><p className="text-[9px] font-bold uppercase tracking-[0.11em] text-slate-400">Matriks</p><p className="mt-1 text-[11px] font-bold text-slate-700">Ambient Air Quality</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-[0.11em] text-slate-400">Acuan</p><p className="mt-1 text-[11px] font-bold text-slate-700">PP No. 22 Tahun 2021</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-[0.11em] text-slate-400">TAT</p><p className="mt-1 text-[11px] font-bold text-slate-700">Normal · 10 hari kerja</p></div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                {parameters.slice(0, 4).map((parameter) => (
                  <ParameterToggle
                    key={parameter.id}
                    parameter={parameter}
                    selected={selectedIds.includes(parameter.id)}
                    onToggle={() => onToggle(parameter.id)}
                  />
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Harga paket per titik</p>
                  <p className="mt-1 text-xl font-black tracking-[-0.03em] text-[#102a43]">Rp8.750.000</p>
                </div>
                <button type="button" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold text-[#13738a] hover:bg-cyan-50"><Plus size={13} /> Tambah paket pengujian</button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [CalendarDays, "Sampling", "19 Agustus 2026"],
                [UserRound, "PIC Customer", "Siti Rahmawati"],
                [Clock3, "Validitas", "30 hari"],
              ].map(([Icon, label, value]) => {
                const InfoIcon = Icon as typeof CalendarDays;
                return (
                  <button type="button" key={String(label)} className="rounded-2xl border border-[#dce2e8] bg-white p-3.5 text-left hover:border-[#8ab8c1]">
                    <InfoIcon size={15} className="text-[#13738a]" />
                    <span className="mt-3 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{String(label)}</span>
                    <span className="mt-1 block text-[11px] font-black text-slate-700">{String(value)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="lg:col-start-2 xl:col-start-auto xl:row-auto">
            <div className="rounded-3xl border border-[#dce2e8] bg-white p-5 shadow-[0_18px_45px_rgba(16,42,67,0.07)] xl:sticky xl:top-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Deal snapshot</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eef4f4] text-[#13738a]"><Target size={15} /></span>
              </div>
              <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Estimasi quotation</p>
              <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#102a43]">{formatRupiah(total)}</p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#f7f8fa] p-3"><p className="text-[9px] text-slate-400">Paket</p><p className="mt-1 text-sm font-black text-slate-800">1</p></div>
                <div className="rounded-xl bg-[#f7f8fa] p-3"><p className="text-[9px] text-slate-400">Parameter</p><p className="mt-1 text-sm font-black text-slate-800">{selectedIds.length}</p></div>
              </div>

              <div className="mt-5 border-y border-slate-100 py-4">
                <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-500">Readiness score</span><span className="text-xs font-black text-lime-700">86%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[86%] rounded-full bg-gradient-to-r from-[#13738a] to-lime-500" /></div>
                <p className="mt-2 text-[9px] leading-4 text-slate-400">Harga sampling dan payment term masih perlu dikonfirmasi.</p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-lime-50 text-lime-700"><Check size={12} /></span><span><span className="block text-[10px] font-bold text-slate-700">Scope tervalidasi</span><span className="text-[9px] text-slate-400">Sesuai katalog resmi</span></span></div>
                <div className="flex items-start gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Clock3 size={12} /></span><span><span className="block text-[10px] font-bold text-slate-700">Menunggu pricing</span><span className="text-[9px] text-slate-400">1 paket belum final</span></span></div>
              </div>

              <button type="button" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#102a43] px-4 py-3 text-xs font-black text-white"><FileText size={14} /> Preview quotation</button>
              <button type="button" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-[#13738a]"><Send size={14} /> Bagikan untuk review</button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ComparisonFooter({ activeConcept }: { activeConcept: ConceptId }) {
  const rows = [
    { label: "Kemudahan belajar", values: ["Sangat tinggi", "Sedang", "Tinggi"] },
    { label: "Kecepatan input", values: ["Tinggi", "Sangat tinggi", "Tinggi"] },
    { label: "Konteks customer", values: ["Cukup", "Tinggi", "Sangat tinggi"] },
    { label: "Cocok untuk", values: ["Tim campuran", "Power user", "Key account"] },
  ];
  const activeIndex = conceptOptions.findIndex((item) => item.id === activeConcept);

  return (
    <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(7,43,107,0.06)]">
      <div className="grid lg:grid-cols-[1fr_1.2fr]">
        <div className="border-b border-slate-200 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <span className="inline-flex items-center gap-2 rounded-full bg-lime-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-lime-800"><Sparkles size={13} /> Rekomendasi saya</span>
          <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-slate-950">Mulai dari Guided Flow, lalu sediakan mode cepat.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Guided Flow paling aman menjadi default karena mengurangi beban kognitif dan kesalahan input. Setelah tim terbiasa, Sales Desk dapat hadir sebagai “compact mode” tanpa memecah model data atau workflow.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Bahasa Indonesia", "Autosave", "Validasi kontekstual", "Mobile ready"].map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">{item}</span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto p-5 sm:p-7">
          <table className="w-full min-w-[32rem] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-transparent pb-3 pr-3 text-[10px] uppercase tracking-[0.12em] text-slate-400">Pertimbangan</th>
                {conceptOptions.map((option) => (
                  <th key={option.id} className={cn("border-b border-slate-200 px-3 pb-3 text-[10px] font-black uppercase tracking-[0.1em]", option.id === activeConcept ? "text-blue-700" : "text-slate-500")}>{option.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th className="border-b border-slate-100 py-3 pr-3 font-bold text-slate-600">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={value} className={cn("border-b border-slate-100 px-3 py-3", index === activeIndex ? "font-black text-blue-700" : "text-slate-500")}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function MarketingUiConcepts() {
  const [activeConcept, setActiveConcept] = useState<ConceptId>("guided");
  const [selectedIds, setSelectedIds] = useState(["so2", "no2", "pm25", "co"]);

  const currentOption = useMemo(
    () => conceptOptions.find((option) => option.id === activeConcept) ?? conceptOptions[0],
    [activeConcept]
  );

  function toggleParameter(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  return (
    <section className="pb-10">
      <header className="relative mb-5 overflow-hidden rounded-[1.75rem] bg-[#061f50] px-5 py-7 text-white shadow-[0_24px_60px_rgba(7,43,107,0.22)] sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(105,203,247,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(105,203,247,.08) 1px,transparent 1px)",
            backgroundSize: "38px 38px",
            maskImage: "linear-gradient(90deg,black,transparent 78%)",
          }}
        />
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-[22%] h-28 w-28 rounded-full bg-lime-400/10 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300"><span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> Marketing experience · UI exploration 2026</p>
            <h1 className="mt-4 text-3xl font-black leading-[1.08] tracking-[-0.045em] sm:text-4xl lg:text-5xl">Tiga cara membuat quotation terasa lebih mudah.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">Bukan sekadar ganti warna. Setiap konsep mengubah cara staf memahami pekerjaan, memilih parameter, dan memastikan penawaran siap dikirim.</p>
          </div>
          <div className="hidden rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm sm:block">
            <Image src="/images/logo-medialab.png" alt="Medialab Indonesia" width={170} height={52} className="h-auto w-36 brightness-0 invert" priority />
            <p className="mt-3 border-t border-white/10 pt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200">Enterprise design study</p>
          </div>
        </div>
      </header>

      <div className="mb-5 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 lg:min-w-0">
          {conceptOptions.map((option) => (
            <ConceptPill
              key={option.id}
              option={option}
              active={option.id === activeConcept}
              onClick={() => setActiveConcept(option.id)}
            />
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Sedang melihat</p>
          <p className="mt-1 text-sm font-black text-slate-800">{currentOption.label} · <span className="font-medium text-slate-500">{currentOption.bestFor}</span></p>
        </div>
        <p className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><MouseHint /> Klik parameter, tab, dan tombol untuk merasakan interaksi prototype</p>
      </div>

      {activeConcept === "guided" && (
        <GuidedFlow selectedIds={selectedIds} onToggle={toggleParameter} />
      )}
      {activeConcept === "desk" && (
        <SalesDesk selectedIds={selectedIds} onToggle={toggleParameter} />
      )}
      {activeConcept === "dealroom" && (
        <DealRoom selectedIds={selectedIds} onToggle={toggleParameter} />
      )}

      <ComparisonFooter activeConcept={activeConcept} />
    </section>
  );
}

function MouseHint() {
  return (
    <span className="relative flex h-5 w-3.5 items-start justify-center rounded-full border border-slate-400 pt-1">
      <span className="h-1 w-0.5 rounded-full bg-slate-400" />
    </span>
  );
}
