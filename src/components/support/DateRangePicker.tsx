"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import {
  DATE_PRESET_LABELS,
  resolveDatePreset,
  type DatePresetKey,
} from "@/lib/support";

export type DateRangeValue = {
  preset: DatePresetKey;
  from: string | null; // ISO date (yyyy-mm-dd)
  to: string | null;
};

type Props = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
};

const PRESETS: DatePresetKey[] = [
  "ALL",
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "YTD",
  "LAST_YEAR",
];

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function toIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Grid 6 minggu (42 sel), Senin sebagai awal minggu — termasuk tanggal bulan sebelum/sesudah untuk mengisi baris. */
function buildCalendarDays(monthAnchor: Date): Date[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const jsDay = firstOfMonth.getDay(); // 0=Minggu
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;

  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function labelForValue(value: DateRangeValue) {
  if (value.preset !== "CUSTOM") return DATE_PRESET_LABELS[value.preset];
  if (!value.from || !value.to) return "Pilih tanggal";
  if (value.from === value.to) return formatDayMonth(value.from, true);
  return `${formatDayMonth(value.from, false)} – ${formatDayMonth(value.to, true)}`;
}

function formatDayMonth(iso: string, withYear: boolean) {
  const d = parseIso(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: withYear ? "numeric" : undefined,
  });
}

export default function DateRangePicker({ value, onChange }: Props) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() =>
    value.from ? parseIso(value.from) : new Date()
  );
  const [customStart, setCustomStart] = useState<Date | null>(
    value.preset === "CUSTOM" && value.from ? parseIso(value.from) : null
  );
  const [customEnd, setCustomEnd] = useState<Date | null>(
    value.preset === "CUSTOM" && value.to ? parseIso(value.to) : null
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const days = useMemo(() => buildCalendarDays(monthAnchor), [monthAnchor]);
  const todayIso = toIso(new Date());

  const rangeStart = customStart;
  const rangeEnd =
    customEnd ?? (customStart && hoverDate ? hoverDate : null);
  const rangeLo =
    rangeStart && rangeEnd
      ? rangeStart < rangeEnd
        ? rangeStart
        : rangeEnd
      : rangeStart;
  const rangeHi =
    rangeStart && rangeEnd
      ? rangeStart < rangeEnd
        ? rangeEnd
        : rangeStart
      : null;

  function pickPreset(preset: DatePresetKey) {
    const range = resolveDatePreset(preset);
    onChange({ preset, from: range.from, to: range.to });
    setOpen(false);
  }

  function pickDay(day: Date) {
    if (!customStart || (customStart && customEnd)) {
      // Mulai seleksi baru.
      setCustomStart(day);
      setCustomEnd(null);
      return;
    }

    // Klik kedua: kunci rentang (urutkan otomatis kalau terbalik).
    const lo = day < customStart ? day : customStart;
    const hi = day < customStart ? customStart : day;
    setCustomStart(lo);
    setCustomEnd(hi);
    onChange({ preset: "CUSTOM", from: toIso(lo), to: toIso(hi) });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300"
      >
        <Calendar size={15} className="text-slate-400" />
        <span className="max-w-[11rem] truncate">{labelForValue(value)}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="absolute right-0 top-full z-30 mt-1.5 flex w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-[28rem] sm:flex-row"
          >
            {/* Preset list */}
            <div className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-slate-100 p-2 sm:w-36 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
              {PRESETS.map((preset) => {
                const isSelected = value.preset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => pickPreset(preset)}
                    className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {DATE_PRESET_LABELS[preset]}
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setCustomStart(null);
                  setCustomEnd(null);
                }}
                className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  value.preset === "CUSTOM"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Custom
                {value.preset === "CUSTOM" && <Check size={14} className="shrink-0" />}
              </button>
            </div>

            {/* Calendar */}
            <div className="flex-1 p-3">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setMonthAnchor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="text-sm font-bold text-slate-700">
                  {monthAnchor.toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setMonthAnchor(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1 text-center">
                {DAY_LABELS.map((label) => (
                  <span
                    key={label}
                    className="text-[10px] font-bold uppercase text-slate-400"
                  >
                    {label}
                  </span>
                ))}

                {days.map((day) => {
                  const iso = toIso(day);
                  const inCurrentMonth = day.getMonth() === monthAnchor.getMonth();
                  const isToday = iso === todayIso;
                  const isAnchor =
                    (rangeLo && toIso(rangeLo) === iso) ||
                    (rangeHi && toIso(rangeHi) === iso);
                  const inRange =
                    rangeLo && rangeHi && day > rangeLo && day < rangeHi;

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={!inCurrentMonth}
                      onMouseEnter={() => setHoverDate(day)}
                      onClick={() => pickDay(day)}
                      className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                        !inCurrentMonth
                          ? "text-slate-200"
                          : isAnchor
                          ? "bg-emerald-500 text-white"
                          : inRange
                          ? "bg-emerald-50 text-emerald-700"
                          : isToday
                          ? "text-emerald-600 ring-1 ring-emerald-300"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                {customStart && !customEnd
                  ? "Pilih tanggal akhir…"
                  : "Klik tanggal awal, lalu tanggal akhir"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
