"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";

type Props = {
  pdfUrl?: string;
  excelUrl?: string;
  compact?: boolean;
};

export default function ExportButtons({ pdfUrl, excelUrl, compact }: Props) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className={[
            "inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 font-semibold text-red-600 transition-colors hover:bg-red-100",
            compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm",
          ].join(" ")}
        >
          {compact ? <FileText size={14} /> : <Download size={16} />}
          PDF
        </a>
      )}

      {excelUrl && (
        <a
          href={excelUrl}
          target="_blank"
          rel="noreferrer"
          className={[
            "inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 transition-colors hover:bg-emerald-100",
            compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm",
          ].join(" ")}
        >
          {compact ? <FileSpreadsheet size={14} /> : <Download size={16} />}
          Excel
        </a>
      )}
    </div>
  );
}