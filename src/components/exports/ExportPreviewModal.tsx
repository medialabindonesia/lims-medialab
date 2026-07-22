"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Loader2, X } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import type { ExcelPreviewModel } from "@/lib/exports/excel-preview";
import ExcelPreviewTable from "./ExcelPreviewTable";

// pdf.js menyentuh API browser (DOMMatrix dkk) saat modul di-load — harus
// dimuat murni di client, tidak boleh ikut lewat SSR/prerender.
const PdfCanvasViewer = dynamic(() => import("./PdfCanvasViewer"), {
  ssr: false,
});

type Props = {
  open: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  excelUrl?: string | null;
  title?: string;
};

function withPreviewMode(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}mode=preview`;
}

/**
 * Modal preview WYSIWYG.
 *
 * PDF: di-fetch sebagai JSON berisi base64 (bukan `application/pdf` mentah),
 * lalu dirender native ke canvas via pdf.js (lihat PdfCanvasViewer.tsx).
 * Kombinasi ini PENTING — response dengan Content-Type application/pdf bisa
 * di-intercept extension download-manager pihak ketiga (IDM dan sejenisnya)
 * yang memonitor SEMUA response jaringan, bukan cuma navigasi/klik unduh.
 * Dengan membungkusnya sebagai JSON, response tidak lagi "terlihat" seperti
 * file yang bisa diunduh di lapisan jaringan sama sekali. Byte PDF-nya tetap
 * identik dengan yang didownload (base64 dari buffer yang sama persis).
 *
 * Excel: dibaca ulang dari buffer .xlsx yang sama persis (lihat
 * src/lib/exports/excel-preview.ts), isi dijamin identik.
 */
export default function ExportPreviewModal({
  open,
  onClose,
  pdfUrl,
  excelUrl,
  title,
}: Props) {
  const reduce = useReducedMotion();
  const [excelModel, setExcelModel] = useState<ExcelPreviewModel | null>(null);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const downloadUrl = pdfUrl || excelUrl || "";
  const isPdf = Boolean(pdfUrl);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !pdfUrl) {
      setPdfBase64(null);
      setPdfError(null);
      return;
    }

    let cancelled = false;
    setLoadingPdf(true);
    setPdfError(null);

    fetch(withPreviewMode(pdfUrl), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat preview PDF");
        return res.json();
      })
      .then((data: { pdfBase64: string }) => {
        if (!cancelled) setPdfBase64(data.pdfBase64);
      })
      .catch(() => {
        if (!cancelled) setPdfError("Gagal memuat preview. Coba unduh langsung.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, pdfUrl]);

  useEffect(() => {
    if (!open || !excelUrl) {
      setExcelModel(null);
      setExcelError(null);
      return;
    }

    let cancelled = false;
    setLoadingExcel(true);
    setExcelError(null);

    fetch(withPreviewMode(excelUrl), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat preview Excel");
        return res.json();
      })
      .then((data: ExcelPreviewModel) => {
        if (!cancelled) setExcelModel(data);
      })
      .catch(() => {
        if (!cancelled) setExcelError("Gagal memuat preview. Coba unduh langsung.");
      })
      .finally(() => {
        if (!cancelled) setLoadingExcel(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, excelUrl]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="export-preview-backdrop"
          initial={reduce ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            onClick={(event) => event.stopPropagation()}
            className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {isPdf ? (
                  <FileText size={18} className="shrink-0 text-red-500" />
                ) : (
                  <FileSpreadsheet size={18} className="shrink-0 text-emerald-600" />
                )}
                <p className="truncate text-sm font-bold text-slate-800">
                  {title || (isPdf ? "Preview PDF" : "Preview Excel")}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
                >
                  <Download size={14} />
                  Unduh {isPdf ? "PDF" : "Excel"}
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden bg-slate-50">
              {isPdf && (
                <>
                  {loadingPdf && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 size={24} className="animate-spin" />
                      <p className="text-sm">Memuat preview…</p>
                    </div>
                  )}
                  {!loadingPdf && pdfError && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                      <p className="text-sm">{pdfError}</p>
                    </div>
                  )}
                  {!loadingPdf && pdfBase64 && (
                    <PdfCanvasViewer base64={pdfBase64} />
                  )}
                </>
              )}

              {!isPdf && excelUrl && (
                <>
                  {loadingExcel && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 size={24} className="animate-spin" />
                      <p className="text-sm">Memuat preview…</p>
                    </div>
                  )}
                  {!loadingExcel && excelError && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                      <p className="text-sm">{excelError}</p>
                    </div>
                  )}
                  {!loadingExcel && excelModel && (
                    <ExcelPreviewTable model={excelModel} />
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
