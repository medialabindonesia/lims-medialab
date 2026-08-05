"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DayPicker, type DateRange } from "@daypicker/react";
import { id as indonesia } from "@daypicker/react/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calendar, Check, X } from "lucide-react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import {
  DATE_PRESET_LABELS,
  resolveDatePreset,
  type DatePresetKey,
} from "@/lib/support";

export type DateRangeValue = {
  preset: DatePresetKey;
  from: string | null;
  to: string | null;
};

type Props = { value: DateRangeValue; onChange: (value: DateRangeValue) => void };
const PRESETS: DatePresetKey[] = ["ALL", "TODAY", "THIS_WEEK", "THIS_MONTH", "YTD", "LAST_YEAR"];
const subscribeToHydration = () => () => {};

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function parseIso(iso?: string | null) {
  if (!iso) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : undefined;
}
function formatIso(iso: string, year = true) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: year ? "numeric" : undefined,
  }).format(parseIso(iso));
}
function label(value: DateRangeValue) {
  if (value.preset !== "CUSTOM") return DATE_PRESET_LABELS[value.preset];
  if (!value.from || !value.to) return "Pilih rentang tanggal";
  return value.from === value.to
    ? formatIso(value.from)
    : `${formatIso(value.from, false)} – ${formatIso(value.to)}`;
}

export default function DateRangePicker({ value, onChange }: Props) {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [open, setOpen] = useState(false);
  const initialRange = useMemo<DateRange | undefined>(() => {
    const from = parseIso(value.from);
    const to = parseIso(value.to);
    return from ? { from, to } : undefined;
  }, [value.from, value.to]);
  const [draft, setDraft] = useState<DateRange | undefined>(initialRange);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function applyPreset(preset: DatePresetKey) {
    const range = resolveDatePreset(preset);
    onChange({ preset, from: range.from, to: range.to });
    setOpen(false);
  }

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE_IN_OUT }}
          className="fixed inset-0 z-[100000] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => event.currentTarget === event.target && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih rentang tanggal"
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl sm:flex-row"
          >
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-blue-100 p-3 sm:w-44 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`flex min-h-10 shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                    value.preset === preset ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {DATE_PRESET_LABELS[preset]}
                  {value.preset === preset && <Check size={13} />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDraft(undefined)}
                className={`flex min-h-10 shrink-0 items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold ${value.preset === "CUSTOM" ? "bg-blue-50 text-blue-800" : "text-slate-600"}`}
              >
                Custom {value.preset === "CUSTOM" && <Check size={13} />}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-2 flex items-center justify-between">
                <div><p className="text-xs font-black uppercase tracking-wide text-blue-600">Kalender</p><p className="text-sm font-black text-slate-900">Tanggal awal sampai akhir</p></div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><X size={17} /></button>
              </div>
              <div className="medialab-day-picker">
                <DayPicker
                  animate={!reduce}
                  mode="range"
                  locale={indonesia}
                  weekStartsOn={1}
                  showOutsideDays
                  selected={draft}
                  onSelect={setDraft}
                  defaultMonth={draft?.from || new Date()}
                />
              </div>
              <button
                type="button"
                disabled={!draft?.from}
                onClick={() => {
                  if (!draft?.from) return;
                  const to = draft.to || draft.from;
                  onChange({ preset: "CUSTOM", from: toIso(draft.from), to: toIso(to) });
                  setOpen(false);
                }}
                className="mt-3 w-full rounded-xl bg-brand-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Terapkan rentang tanggal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(initialRange);
          setOpen(true);
        }}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:border-blue-300"
      >
        <Calendar size={15} className="text-blue-600" />
        <span className="max-w-[12rem] truncate">{label(value)}</span>
      </button>
      {mounted ? createPortal(dialog, document.body) : null}
    </>
  );
}
