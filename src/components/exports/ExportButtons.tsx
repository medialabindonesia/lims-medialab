"use client";

import { useState } from "react";
import { Eye, FileSpreadsheet, FileText } from "lucide-react";
import ExportPreviewModal from "./ExportPreviewModal";

type Props = {
  pdfUrl?: string;
  excelUrl?: string;
  compact?: boolean;
  title?: string;
};

/**
 * Tombol PDF/Excel di seluruh app lewat komponen ini. Klik membuka preview
 * WYSIWYG (bukan langsung download) — opsi unduh ada di dalam modal preview
 * itu sendiri. Lihat ExportPreviewModal.tsx untuk jaminan WYSIWYG-nya.
 */
export default function ExportButtons({
  pdfUrl,
  excelUrl,
  compact,
  title,
}: Props) {
  const [previewType, setPreviewType] = useState<"pdf" | "excel" | null>(null);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        {pdfUrl && (
          <button
            type="button"
            onClick={() => setPreviewType("pdf")}
            className={[
              "inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 font-semibold text-red-600 transition-colors hover:bg-red-100",
              // py-3 (bukan py-2) supaya area tekan mendekati 40px — mode
              // "compact" tetap ringkas secara visual (text-xs, ikon kecil)
              // tapi tetap nyaman ditekan jari di HP.
              compact ? "px-3.5 py-3 text-xs" : "px-4 py-3 text-sm",
            ].join(" ")}
          >
            {compact ? <FileText size={15} /> : <Eye size={16} />}
            PDF
          </button>
        )}

        {excelUrl && (
          <button
            type="button"
            onClick={() => setPreviewType("excel")}
            className={[
              "inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 transition-colors hover:bg-emerald-100",
              compact ? "px-3.5 py-3 text-xs" : "px-4 py-3 text-sm",
            ].join(" ")}
          >
            {compact ? <FileSpreadsheet size={15} /> : <Eye size={16} />}
            Excel
          </button>
        )}
      </div>

      <ExportPreviewModal
        open={previewType !== null}
        onClose={() => setPreviewType(null)}
        pdfUrl={previewType === "pdf" ? pdfUrl : null}
        excelUrl={previewType === "excel" ? excelUrl : null}
        title={title}
      />
    </>
  );
}
