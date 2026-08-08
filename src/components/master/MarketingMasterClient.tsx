"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

      {open && (
        <>
          {node.regulations.length > 0 && (
            <ul style={{ paddingLeft: `${(depth + 1) * 1.15 + 1.4}rem` }}>
              {node.regulations.map((regulation) => (
                <li
                  key={regulation.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1"
                >
                  <span
                    className={`text-xs font-semibold ${
                      regulation.isActive
                        ? "text-blue-700"
                        : "text-slate-400 line-through"
                    }`}
                  >
                    {regulation.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      regulation.parameterCount === 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {regulation.parameterCount} parameter
                  </span>
                </li>
              ))}
            </ul>
          )}

          {node.children.length > 0 && (
            <ul>
              {node.children.map((child) => (
                <MatrixBranch key={child.id} node={child} depth={depth + 1} />
              ))}
            </ul>
          )}
        </>
      )}
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
