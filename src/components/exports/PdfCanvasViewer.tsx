"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.15;

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type Props = {
  base64: string;
};

/**
 * Render PDF native ke canvas via pdf.js — tidak lewat plugin PDF bawaan
 * browser (iframe/native viewer). Ini membuat kita sepenuhnya lepas dari
 * ketergantungan pada viewer browser, sekaligus (dikombinasikan dengan
 * transport base64/JSON di server) menghilangkan jejak "file yang bisa
 * diunduh" di lapisan jaringan — sehingga extension download-manager pihak
 * ketiga (IDM dkk) tidak lagi punya apapun untuk di-intercept.
 */
export default function PdfCanvasViewer({ base64 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.15);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setNumPages(0);

    const loadingTask = pdfjsLib.getDocument({ data: base64ToBytes(base64) });

    loadingTask.promise
      .then((doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal merender preview PDF. Coba unduh langsung.");
      });

    return () => {
      cancelled = true;
      docRef.current = null;
      // destroy() di loadingTask aman dipanggil kapan pun (baik promise-nya
      // sudah resolve atau belum) — membatalkan request jaringan yang masih
      // berjalan dan mematikan worker, mencegah kebocoran memori.
      loadingTask.destroy();
    };
  }, [base64]);

  useEffect(() => {
    const doc = docRef.current;
    const container = containerRef.current;
    if (!doc || !container || numPages === 0) return;

    let cancelled = false;
    setRendering(true);

    async function renderAllPages() {
      if (!doc || !container) return;
      container.innerHTML = "";

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (cancelled) return;

        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.className = "mx-auto mb-4 block rounded-lg bg-white shadow-md";
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvas, viewport }).promise;
        if (cancelled) return;

        container.appendChild(canvas);
      }

      if (!cancelled) setRendering(false);
    }

    renderAllPages().catch(() => {
      if (!cancelled) setError("Gagal merender preview PDF. Coba unduh langsung.");
    });

    return () => {
      cancelled = true;
    };
  }, [numPages, scale]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))}
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
          onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))}
          disabled={scale >= MAX_SCALE}
          aria-label="Perbesar"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomIn size={16} />
        </button>
        {numPages > 0 && (
          <span className="ml-2 text-xs text-slate-400">{numPages} halaman</span>
        )}
      </div>

      <div className="relative flex-1 overflow-auto bg-slate-100 p-4">
        {rendering && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100/80 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Merender PDF…</p>
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
