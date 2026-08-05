"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "@daypicker/react";
import { id as indonesia } from "@daypicker/react/locale";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Clock3, X } from "lucide-react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  includeTime?: boolean;
  min?: string;
  max?: string;
  className?: string;
};

const subscribeToHydration = () => () => {};

function parseLocalDate(value: string) {
  const [datePart] = value.split("T");
  if (!datePart) return undefined;
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatValue(value: string, includeTime: boolean) {
  const date = parseLocalDate(value);
  if (!date) return "";
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  if (!includeTime) return dateLabel;
  const time = value.split("T")[1]?.slice(0, 5) || "00:00";
  return `${dateLabel}, ${time} WIB`;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Pilih tanggal",
  disabled,
  required,
  includeTime = false,
  min,
  max,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const dialogId = useId();
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseLocalDate(value), [value]);
  const time = value.split("T")[1]?.slice(0, 5) || "08:00";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const disabledMatcher = [
    ...(min && parseLocalDate(min) ? [{ before: parseLocalDate(min)! }] : []),
    ...(max && parseLocalDate(max) ? [{ after: parseLocalDate(max)! }] : []),
  ];

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100000] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE_IN_OUT }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <motion.div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label={label || "Pilih tanggal"}
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_28px_90px_rgba(7,43,107,0.28)]"
          >
            <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                  Kalender
                </p>
                <p className="mt-1 font-black text-slate-900">
                  {label || "Pilih tanggal"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup kalender"
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="medialab-day-picker p-4">
              <DayPicker
                animate={!reduce}
                mode="single"
                locale={indonesia}
                weekStartsOn={1}
                showOutsideDays
                selected={selected}
                defaultMonth={selected || new Date()}
                disabled={disabledMatcher}
                onSelect={(date) => {
                  if (!date) return;
                  const nextDate = toIsoDate(date);
                  onChange(includeTime ? `${nextDate}T${time}` : nextDate);
                  if (!includeTime) setOpen(false);
                }}
              />
            </div>

            {includeTime && (
              <div className="border-t border-blue-100 px-5 py-4">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Clock3 size={14} /> Waktu (WIB)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => {
                    const date = value.split("T")[0] || toIsoDate(new Date());
                    onChange(`${date}T${event.target.value}`);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 w-full rounded-xl bg-brand-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-deep"
                >
                  Terapkan tanggal & waktu
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-600">
          {label}{required ? " *" : ""}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left outline-none transition duration-200 hover:border-blue-300 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
      >
        <CalendarDays size={17} className="shrink-0 text-blue-600" />
        <span className={value ? "font-semibold text-slate-900" : "text-slate-400"}>
          {value ? formatValue(value, includeTime) : placeholder}
        </span>
      </button>
      {mounted ? createPortal(dialog, document.body) : null}
    </div>
  );
}
