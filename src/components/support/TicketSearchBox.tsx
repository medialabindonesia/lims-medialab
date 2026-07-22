"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Search } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { formatShortDate, type TicketIndexEntry } from "@/lib/support";
import { TicketStatusBadge } from "@/components/support/Badges";

const MAX_RESULTS = 8;
const STALE_MS = 30_000;

/**
 * Search instan: index ringan tiket diambil SEKALI (bukan per keystroke) lalu
 * difilter di browser. Ini yang membuat pencarian terasa 0ms — tak ada
 * round-trip ke server remote (~1-2.5s+) tiap huruf yang diketik. Klik hasil
 * langsung membuka percakapan tiket (spotlight-search style).
 */
export default function TicketSearchBox() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [index, setIndex] = useState<TicketIndexEntry[] | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const lastFetchRef = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  async function loadIndex() {
    if (Date.now() - lastFetchRef.current < STALE_MS && index) return;
    setLoadingIndex(true);
    try {
      const res = await fetch("/api/support/tickets/index", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setIndex(data.index ?? []);
        lastFetchRef.current = Date.now();
      }
    } catch {
      /* diamkan — pencarian tetap jalan dengan index terakhir (atau kosong) */
    } finally {
      setLoadingIndex(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const results = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return index
      .filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.ticketNo.toLowerCase().includes(q) ||
          (t.customerName || "").toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS);
  }, [index, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  function openTicket(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/support/desk/${id}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((prev) => (prev - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = results[activeIdx];
      if (picked) openTicket(picked.id);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full sm:w-72">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        {loadingIndex ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : (
          <Search size={16} className="text-slate-400" />
        )}
        <input
          value={query}
          onFocus={() => {
            setOpen(true);
            loadIndex();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cari subjek / no tiket / customer"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <AnimatePresence>
        {open && query.trim() && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
            className="absolute left-0 top-full z-30 mt-1.5 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-88"
          >
            {results.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-slate-400">
                {index === null
                  ? "Memuat index pencarian…"
                  : "Tidak ada tiket yang cocok."}
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto p-1.5">
                {results.map((ticket, idx) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => openTicket(ticket.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      idx === activeIdx ? "bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {ticket.subject}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {ticket.ticketNo} · {ticket.customerName || "-"} ·{" "}
                        {formatShortDate(ticket.createdAt)}
                      </p>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
