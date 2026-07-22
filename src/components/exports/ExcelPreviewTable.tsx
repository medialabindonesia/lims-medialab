"use client";

import { useState } from "react";
import type { ExcelPreviewModel } from "@/lib/exports/excel-preview";

/**
 * Render tabel dari model yang dibaca ULANG dari buffer .xlsx yang sama
 * persis dengan yang didownload — isi (angka/teks/warna/border) dijamin
 * identik. Styling visual HTML tidak 100% pixel-perfect dengan Excel native
 * (keterbatasan platform web), tapi datanya berasal dari file yang sama.
 */
export default function ExcelPreviewTable({
  model,
}: {
  model: ExcelPreviewModel;
}) {
  const [activeSheet, setActiveSheet] = useState(0);
  const sheet = model.sheets[activeSheet];

  if (!sheet) {
    return (
      <p className="p-6 text-center text-sm text-slate-400">
        Tidak ada data untuk ditampilkan.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {model.sheets.length > 1 && (
        <div className="flex shrink-0 gap-1 border-b border-slate-200 bg-slate-50 px-3 pt-2">
          {model.sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActiveSheet(i)}
              className={`rounded-t-xl px-3.5 py-2 text-xs font-bold transition ${
                i === activeSheet
                  ? "bg-white text-emerald-700"
                  : "text-slate-500 hover:bg-white/60"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white p-3">
        <table
          className="border-collapse text-sm"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            {sheet.colWidthsPx.map((w, i) => (
              <col key={i} style={{ width: `${Math.max(w, 40)}px` }} />
            ))}
          </colgroup>
          <tbody>
            {sheet.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => {
                  if (cell === null) return null;

                  const align =
                    cell.align || (cell.numeric ? "right" : "left");

                  return (
                    <td
                      key={colIdx}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      className="overflow-hidden px-2 py-1.5 align-middle"
                      style={{
                        textAlign: align,
                        fontWeight: cell.bold ? 700 : 400,
                        fontStyle: cell.italic ? "italic" : "normal",
                        color: cell.fontColor,
                        backgroundColor: cell.fillColor,
                        border: cell.bordered ? "1px solid #e2e8f0" : undefined,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {cell.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
