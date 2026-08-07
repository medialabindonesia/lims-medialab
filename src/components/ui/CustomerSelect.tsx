"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

/**
 * Pemilih customer dengan pencarian sisi server.
 *
 * Daftar customer Medialab berjumlah ratusan mendekati ribuan, sehingga tidak
 * dimuat sekaligus. Setiap ketikan memicu pencarian ke
 * GET /api/master/customers/search.
 *
 * Nama panjang ditampilkan penuh dalam dua baris, bukan dipotong titik tiga,
 * karena banyak nama PT hanya berbeda di bagian belakang. Baris kedua berisi
 * kota dan PIC sebagai pembeda tambahan.
 */

export type CustomerLite = {
  id: string;
  name: string;
  company?: string | null;
  city?: string | null;
  province?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Props = {
  value: string;
  selectedCustomer?: CustomerLite | null;
  onChange: (customerId: string, customer: CustomerLite | null) => void;
  disabled?: boolean;
  /** Tombol "Tambah customer" hanya muncul bila role boleh membuat quotation. */
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
};

type Position = { top: number; left: number; width: number; openUp: boolean };

const subscribeToHydration = () => () => {};

const PANEL_MIN_WIDTH = 340;
const PANEL_MAX_HEIGHT = 340;
const DEBOUNCE_MS = 220;

/** Menyorot potongan teks yang cocok dengan kata kunci pencarian. */
function highlight(text: string, query: string) {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-amber-100 px-0.5 text-inherit">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

function secondaryLine(customer: CustomerLite) {
  return [customer.city, customer.contactPerson].filter(Boolean).join(" · ");
}

export default function CustomerSelect({
  value,
  selectedCustomer,
  onChange,
  disabled,
  allowCreate = false,
  placeholder = "Cari nama customer",
  className,
}: Props) {
  const reduce = useReducedMotion();
  const listboxId = useId();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerLite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "create">("search");

  const [draftName, setDraftName] = useState("");
  const [draftContact, setDraftContact] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftCity, setDraftCity] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const width = Math.min(
      Math.max(rect.width, PANEL_MIN_WIDTH),
      window.innerWidth - 16
    );
    const roomBelow = window.innerHeight - rect.bottom;
    const openUp = roomBelow < PANEL_MAX_HEIGHT + 16 && rect.top > roomBelow;

    setPosition({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      openUp,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  // Pencarian ditunda sesaat agar mengetik cepat tidak memicu satu request
  // per huruf. Request lama dibatalkan supaya hasil tidak datang terbalik urutan.
  useEffect(() => {
    if (!open || mode !== "search") return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      // Status loading dinyalakan setelah jeda debounce, bukan di badan efek,
      // agar spinner tidak berkedip pada setiap ketukan tombol.
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: "20" });
        if (query.trim()) params.set("q", query.trim());

        const response = await fetch(
          `/api/master/customers/search?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? "Tidak punya akses ke daftar customer."
              : "Gagal memuat customer."
          );
        }

        const data = await response.json();
        setResults(data.customers ?? []);
        setTotal(data.total ?? 0);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setError((caught as Error).message);
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, mode]);

  function openPanel() {
    if (disabled) return;
    setOpen(true);
    setMode("search");
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  function select(customer: CustomerLite) {
    onChange(customer.id, customer);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function startCreate() {
    setMode("create");
    setDraftName(query.trim());
    setDraftContact("");
    setDraftPhone("");
    setDraftCity("");
    setCreateError(null);
  }

  async function submitCreate() {
    if (draftName.trim().length < 3) {
      setCreateError("Nama customer minimal 3 karakter.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/master/customers/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim(),
          contactPerson: draftContact.trim(),
          phone: draftPhone.trim(),
          city: draftCity.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateError(data?.message ?? "Gagal menambah customer.");
        return;
      }

      select(data.customer as CustomerLite);
      setMode("search");
      setQuery("");
    } catch {
      setCreateError("Gagal menghubungi server.");
    } finally {
      setCreating(false);
    }
  }

  const triggerLabel = selectedCustomer?.name ?? "";

  const searchPanel = (
    <>
      <div className="sticky top-0 z-10 -m-1.5 mb-1 border-b border-slate-100 bg-white p-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 focus-within:border-blue-300 focus-within:bg-white">
          <Search size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
          {loading && (
            <Loader2
              size={15}
              className="shrink-0 animate-spin text-blue-500"
              aria-hidden="true"
            />
          )}
          {!loading && query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              aria-label="Bersihkan pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="px-3 py-4 text-center text-sm text-rose-500">{error}</p>
      )}

      {!error &&
        results.map((customer) => {
          const isSelected = customer.id === value;
          const detail = secondaryLine(customer);

          return (
            <button
              key={customer.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => select(customer)}
              className={`flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition duration-150 ${
                isSelected ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <span className="min-w-0">
                <span
                  className={`block text-sm font-semibold leading-snug ${
                    isSelected ? "text-blue-800" : "text-slate-700"
                  }`}
                >
                  {highlight(customer.name, query.trim())}
                </span>
                {detail && (
                  <span className="mt-0.5 block text-xs font-medium text-slate-400">
                    {detail}
                  </span>
                )}
              </span>
              {isSelected && (
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-lime text-brand-navy">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}

      {!error && !loading && results.length === 0 && (
        <p className="px-3 py-5 text-center text-sm text-slate-400">
          {query.trim()
            ? `Tidak ada customer cocok dengan "${query.trim()}".`
            : "Belum ada customer terdaftar."}
        </p>
      )}

      {!error && total > results.length && (
        <p className="px-3 py-2 text-center text-xs font-medium text-slate-400">
          Menampilkan {results.length} dari {total}. Ketik lebih spesifik untuk
          mempersempit.
        </p>
      )}

      {allowCreate && (
        <div className="sticky bottom-0 -m-1.5 mt-1 border-t border-slate-100 bg-white p-1.5">
          <button
            type="button"
            onClick={startCreate}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <Plus size={15} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {query.trim()
                ? `Tambah customer "${query.trim()}"`
                : "Tambah customer baru"}
            </span>
          </button>
        </div>
      )}
    </>
  );

  const createPanel = (
    <div className="p-2">
      <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        Customer baru
      </p>

      <div className="space-y-2">
        <input
          autoFocus
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Nama PT / instansi *"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
        />
        <input
          value={draftContact}
          onChange={(event) => setDraftContact(event.target.value)}
          placeholder="Nama PIC"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
        />
        <div className="flex gap-2">
          <input
            value={draftPhone}
            onChange={(event) => setDraftPhone(event.target.value)}
            placeholder="Telepon"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
          />
          <input
            value={draftCity}
            onChange={(event) => setDraftCity(event.target.value)}
            placeholder="Kota"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
          />
        </div>
      </div>

      <p className="mt-2 px-1 text-xs text-slate-400">
        Alamat, NPWP, dan data penagihan dilengkapi belakangan di Master Customer.
      </p>

      {createError && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
          {createError}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("search")}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={submitCreate}
          disabled={creating}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {creating && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          Simpan customer
        </button>
      </div>
    </div>
  );

  const menu = (
    <AnimatePresence>
      {open && position && (
        <motion.div
          ref={menuRef}
          id={listboxId}
          role={mode === "search" ? "listbox" : undefined}
          aria-label="Daftar customer"
          initial={
            reduce
              ? false
              : { opacity: 0, y: position.openUp ? 7 : -7, scale: 0.98 }
          }
          animate={{ opacity: 1, y: position.openUp ? "-100%" : 0, scale: 1 }}
          exit={
            reduce
              ? undefined
              : { opacity: 0, y: position.openUp ? -8 : -6, scale: 0.98 }
          }
          transition={{ duration: 0.18, ease: open ? EASE_OUT : EASE_IN_OUT }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: PANEL_MAX_HEIGHT,
          }}
          className="z-[100001] overflow-y-auto rounded-xl border border-blue-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(7,43,107,0.2)]"
        >
          {mode === "search" ? searchPanel : createPanel}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 outline-none transition duration-200 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
      >
        <span className="min-w-0">
          {triggerLabel ? (
            <>
              {/* Dibiarkan membungkus sampai dua baris; nama PT panjang sering
                  hanya berbeda di bagian belakang sehingga tidak boleh dipotong. */}
              <span className="line-clamp-2 leading-snug">{triggerLabel}</span>
              {selectedCustomer && secondaryLine(selectedCustomer) && (
                <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">
                  {secondaryLine(selectedCustomer)}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400">Pilih customer</span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-blue-600 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {mounted ? createPortal(menu, document.body) : null}
    </div>
  );
}
