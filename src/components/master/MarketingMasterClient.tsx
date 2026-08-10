"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

/**
 * Pengelolaan master marketing lewat Excel.
 *
 * Alurnya sengaja bolak-balik dan bukan form kosong: berkas yang diunduh sudah
 * berisi keadaan sekarang, sehingga orang sales cukup mengoreksi sel dan
 * menambah baris. Meminta seseorang mengisi template kosong dari nol jauh
 * lebih kecil kemungkinannya dikerjakan.
 */

export type MatrixTreeNode = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  regulations: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    parameterCount: number;
    parameters: Array<{
      id: string;
      name: string;
      unit?: string | null;
      method?: string | null;
      limitValue?: string | null;
      limitValue2?: string | null;
      samplingMethod?: string | null;
      sampleMatrix?: string | null;
      sampleSize?: string | null;
      basePrice?: number | null;
      isAccredited: boolean;
      durations: Array<{ label: string; limitValue?: string | null; isDefault: boolean }>;
    }>;
  }>;
  children: MatrixTreeNode[];
};

type ImportResult = {
  message: string;
  errors?: string[];
  summary?: Record<string, number>;
};

type Props = {
  tree: MatrixTreeNode[];
  totalParameters: number;
  unpricedCount: number;
};

function MatrixBranch({ node, depth }: { node: MatrixTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0 || node.regulations.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-2 py-1.5"
        style={{ paddingLeft: `${depth * 1.15}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Tutup" : "Buka"}
            className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${open ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-[22px]" />
        )}

        <span
          className={`text-sm font-bold ${
            node.isActive ? "text-slate-700" : "text-slate-400 line-through"
          }`}
        >
          {node.name}
        </span>
        <span className="font-mono text-[11px] text-slate-400">{node.code}</span>
      </div>

      <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          {node.regulations.length > 0 && (
            <ul style={{ paddingLeft: `${(depth + 1) * 1.15 + 1.4}rem` }}>
              {node.regulations.map((regulation) => <RegulationBranch key={regulation.id} regulation={regulation} />)}
            </ul>
          )}

          {node.children.length > 0 && (
            <ul>
              {node.children.map((child) => (
                <MatrixBranch key={child.id} node={child} depth={depth + 1} />
              ))}
            </ul>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </li>
  );
}

function RegulationBranch({ regulation }: { regulation: MatrixTreeNode["regulations"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-1">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full flex-wrap items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-blue-50">
        <ChevronRight size={14} className={`shrink-0 text-blue-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        <span className={`text-xs font-semibold ${regulation.isActive ? "text-blue-700" : "text-slate-400 line-through"}`}>{regulation.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${regulation.parameterCount === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{regulation.parameterCount} parameter</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: "easeInOut" }} className="overflow-hidden">
            <div className="ml-5 mt-1 overflow-x-auto rounded-xl border border-blue-100 bg-blue-50/40">
              <table className="w-full min-w-[760px] text-left text-[11px]">
                <thead className="text-slate-500"><tr><th className="px-3 py-2">Parameter</th><th className="px-3 py-2">Jam / durasi & baku mutu</th><th className="px-3 py-2">Metode</th><th className="px-3 py-2">Sampling</th><th className="px-3 py-2 text-right">Harga dasar</th></tr></thead>
                <tbody>
                  {regulation.parameters.map((parameter) => (
                    <tr key={parameter.id} className="border-t border-blue-100 bg-white/80 align-top">
                      <td className="px-3 py-2 font-bold text-slate-800">{parameter.name}{parameter.unit ? <span className="ml-1 font-normal text-slate-400">({parameter.unit})</span> : null}{!parameter.isAccredited ? <span className="ml-1 text-amber-600">*</span> : null}</td>
                      <td className="px-3 py-2 text-slate-600">{parameter.durations.length ? parameter.durations.map((entry) => `${entry.label}${entry.limitValue ? ` = ${entry.limitValue}` : ""}`).join(" · ") : parameter.limitValue || parameter.limitValue2 || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{parameter.method || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{[parameter.samplingMethod, parameter.sampleMatrix, parameter.sampleSize].filter(Boolean).join(" · ") || "-"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700">{parameter.basePrice == null ? "Belum diisi" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(parameter.basePrice)}</td>
                    </tr>
                  ))}
                  {regulation.parameters.length === 0 ? <tr><td colSpan={5} className="px-3 py-4 text-center text-amber-700">Belum ada parameter pada regulasi ini.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export default function MarketingMasterClient({
  tree,
  totalParameters,
  unpricedCount,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [failed, setFailed] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    setResult(null);
    setFailed(false);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/master/marketing/import", {
        method: "POST",
        body,
      });

      const data: ImportResult = await response.json();

      setResult(data);
      setFailed(!response.ok);

      if (response.ok) router.refresh();
    } catch (error) {
      setResult({ message: (error as Error).message });
      setFailed(true);
    } finally {
      setUploading(false);
      // Supaya berkas yang sama bisa diunggah lagi setelah dikoreksi.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Parameter aktif</p>
          <p className="mt-1 text-3xl font-black text-slate-800">
            {totalParameters}
          </p>
        </div>

        <div
          className={`rounded-[1.5rem] border p-5 ${
            unpricedCount > 0
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              unpricedCount > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            Belum punya harga dasar
          </p>
          <p
            className={`mt-1 text-3xl font-black ${
              unpricedCount > 0 ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {unpricedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {unpricedCount > 0
              ? "Quotation tetap bisa disusun, tetapi belum bisa di-approve."
              : "Seluruh parameter sudah berharga."}
          </p>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-slate-800">Pengisian lewat Excel</h2>
            <p className="mt-1 text-sm text-slate-500">
              Unduh berkas — isinya sudah berupa data yang ada sekarang, bukan
              form kosong. Koreksi selnya, tambahkan baris baru di bawah, lalu
              unggah kembali. Pencocokan memakai kolom kode, jadi mengunggah
              berkas yang sama dua kali tidak menggandakan data.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Menghapus baris di Excel tidak menghapus datanya di sistem. Untuk
              menonaktifkan, isi kolom <code>isActive</code> dengan{" "}
              <code>NO</code>.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/master/marketing/export"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <Download size={16} />
            Unduh berkas master
          </a>

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {uploading ? "Memproses…" : "Unggah berkas"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>

        {result && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              failed
                ? "border-rose-200 bg-rose-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <p
              className={`flex items-start gap-2 text-sm font-bold ${
                failed ? "text-rose-700" : "text-emerald-800"
              }`}
            >
              {failed ? (
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              )}
              {result.message}
            </p>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold text-slate-600">
                  {result.errors.length} baris dilewati:
                </p>
                <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-xs text-slate-600">
                  {result.errors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-800">Struktur terpasang</h2>
        <p className="mt-1 text-sm text-slate-500">
          Persis inilah yang dilihat sales sebagai pilihan bertingkat di
          langkah Parameter.
        </p>

        {tree.length === 0 ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            Belum ada matriks. Unduh berkas master, isi sheet Matriks, lalu
            unggah kembali.
          </p>
        ) : (
          <ul className="mt-4">
            {tree.map((node) => (
              <MatrixBranch key={node.id} node={node} depth={0} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
