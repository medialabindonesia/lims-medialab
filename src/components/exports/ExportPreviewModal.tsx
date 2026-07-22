"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Loader2, X } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import type { ExcelPreviewModel } from "@/lib/exports/excel-preview";
import ExcelPreviewTable from "./ExcelPreviewTable";

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
 * PDF: di-fetch via JS lalu dijadikan Blob URL lokal (bukan langsung
 * <iframe src="url-jaringan-asli">). Ini PENTING — kalau iframe menunjuk
 * langsung ke URL jaringan yang "terlihat" seperti file downloadable,
 * extension download-manager pihak ketiga (IDM dan sejenisnya, sangat
 * umum dipakai) akan meng-intercept-nya dan memaksa munculkan dialog
 * download — TERLEPAS dari header Content-Disposition: inline yang kita
 * kirim. Blob URL (blob:...) bersifat lokal di browser, tidak ada request
 * jaringan yang bisa di-hook oleh extension semacam itu. Byte-nya tetap
 * identik dengan yang didownload (fetch dari endpoint yang sama).
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
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
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
      setPdfBlobUrl(null);
      setPdfError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoadingPdf(true);
    setPdfError(null);

    fetch(withPreviewMode(pdfUrl), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat preview PDF");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPdfError("Gagal memuat preview. Coba unduh langsung.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });

    // Bebaskan memori blob saat modal ditutup/tiket berganti — penting
    // untuk PDF berukuran besar supaya tidak menumpuk di memori browser.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
                  {!loadingPdf && pdfBlobUrl && (
                    <iframe
                      src={pdfBlobUrl}
                      title={title || "Preview PDF"}
                      className="h-full w-full border-0"
                    />
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
