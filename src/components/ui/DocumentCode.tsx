"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

type DocumentCodeProps = {
  code: string;
  label?: string;
  className?: string;
};

/**
 * Kode dokumen penuh + tombol salin. Ditempatkan sebagai informasi sekunder:
 * customer memakai judul & nomor pendek untuk mengenali pesanan, tetapi kode
 * penuh tetap bisa disalin saat berkomunikasi dengan tim kami.
 */
export default function DocumentCode({
  code,
  label = "Kode dokumen",
  className,
}: DocumentCodeProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), 1800);

    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate font-mono text-xs text-slate-600">{code}</p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Salin ${label}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        {copied ? (
          <Check size={15} className="text-emerald-600" />
        ) : (
          <Copy size={15} />
        )}
      </button>
    </div>
  );
}
