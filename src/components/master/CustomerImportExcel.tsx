"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

async function safeReadJson(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function CustomerImportExcel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  async function uploadFile(file: File) {
    setLoading(true);
    setMessage("");
    setErrors([]);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/master/customers/import", {
      method: "POST",
      body: formData,
    });

    const data = await safeReadJson(response);

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Import gagal");
      setErrors(data.errors || []);
      return;
    }

    setMessage(data.message || "Import berhasil");
    setErrors(data.errors || []);

    window.setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  return (
    <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
            <FileSpreadsheet size={22} />
          </div>

          <h3 className="text-xl font-black text-slate-900">
            Import Master Customer
          </h3>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Download template Excel terlebih dahulu, isi data customer, lalu
            upload kembali untuk membuat atau update master customer.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/master/customers/template"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <Download size={17} />
            Download Template
          </a>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                uploadFile(file);
              }

              event.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={17} />
            {loading ? "Importing..." : "Upload Excel"}
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </p>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 text-sm font-bold text-yellow-700">
            Catatan import:
          </p>

          <ul className="space-y-1 text-sm text-yellow-700">
            {errors.slice(0, 10).map((error, index) => (
              <li key={`${error}-${index}`}>- {error}</li>
            ))}
          </ul>

          {errors.length > 10 && (
            <p className="mt-2 text-xs text-yellow-700">
              Masih ada {errors.length - 10} error lainnya.
            </p>
          )}
        </div>
      )}
    </div>
  );
}