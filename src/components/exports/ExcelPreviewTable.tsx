"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { ExcelPreviewModel } from "@/lib/exports/excel-preview";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.15;

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
  const [scale, setScale] = useState(1);
  const sheet = model.sheets[activeSheet];

  if (!sheet) {
    return (
      <p className="p-6 text-center text-sm text-slate-400">
        Tidak ada data untuk ditampilkan.
      </p>
    );
  }

  const tableWidthPx = sheet.colWidthsPx.reduce(
    (sum, w) => sum + Math.max(w, 40),
    0
  );

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

      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() =>
            setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))
          }
          disabled={scale <= MIN_SCALE}
          aria-label="Perkecil"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomOut size={16} />
        </button>
        <span className="w-12 text-center text-xs font-semibold text-slate-500">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() =>
            setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))
          }
          disabled={scale >= MAX_SCALE}
          aria-label="Perbesar"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white p-3">
        {/* Wrapper dengan lebar/tinggi EKSPLISIT sebesar hasil scale — transform
            tidak memengaruhi ukuran box aslinya, jadi tanpa wrapper ini area
            scroll container tidak akan mengikuti ukuran tabel setelah di-zoom. */}
        <div
          style={{
            width: tableWidthPx * scale,
            height: sheet.rows.length * 28 * scale,
          }}
        >
          <table
            className="border-collapse text-sm"
            style={{
              tableLayout: "fixed",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              // Lebar total EKSPLISIT — tanpa ini, table-layout:fixed tetap
              // mengecilkan semua kolom secara proporsional supaya muat di
              // container sempit (mis. modal di layar HP), mengalahkan lebar
              // minimum per kolom dan memaksa teks label pecah per-karakter.
              // Dengan lebar pasti, kelebihan lebar ditangani oleh scroll
              // horizontal di container (div overflow-auto), bukan penyusutan.
              width: tableWidthPx,
            }}
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
                          border: cell.bordered
                            ? "1px solid #e2e8f0"
                            : undefined,
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
    </div>
  );
}
