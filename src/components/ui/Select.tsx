"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  buttonClassName?: string;
};

export default function Select({
  value,
  onChange,
  options,
  className,
  buttonClassName,
}: Props) {
  const reduce = useReducedMotion();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
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

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function focusOption(index: number) {
    if (!options.length) return;

    const nextIndex = (index + options.length) % options.length;
    setActiveIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }

  function openAt(index: number) {
    if (!options.length) return;

    setOpen(true);
    focusOption(index);
  }

  function selectOption(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openAt(selectedIndex);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openAt(selectedIndex);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            openAt(selectedIndex - 1);
          }
          if (event.key === "Home") {
            event.preventDefault();
            openAt(0);
          }
          if (event.key === "End") {
            event.preventDefault();
            openAt(options.length - 1);
          }
        }}
        className={
          buttonClassName ??
          "flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:border-blue-200 hover:bg-blue-50"
        }
      >
        <span className="truncate">{selected?.label ?? "Pilih opsi"}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-blue-600 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label="Pilihan tersedia"
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="absolute left-0 top-full z-30 mt-1.5 max-h-72 min-w-full overflow-y-auto rounded-xl border border-blue-100 bg-white p-1.5 shadow-[0_18px_45px_rgba(7,43,107,0.16)]"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = activeIndex === index;

              return (
                <button
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  id={`${listboxId}-option-${index}`}
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isActive ? 0 : -1}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusOption(index + 1);
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      focusOption(index - 1);
                    }
                    if (event.key === "Home") {
                      event.preventDefault();
                      focusOption(0);
                    }
                    if (event.key === "End") {
                      event.preventDefault();
                      focusOption(options.length - 1);
                    }
                    if (event.key === "Tab") setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                    isSelected
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-600 hover:bg-slate-50"
                  } ${isActive ? "ring-2 ring-inset ring-blue-200" : ""}`}
                >
                  {option.label}
                  {isSelected && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-lime text-brand-navy">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
