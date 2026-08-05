"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

type Position = { top: number; left: number; width: number; openUp: boolean };
const subscribeToHydration = () => () => {};

export default function Select({
  value,
  onChange,
  options,
  className,
  buttonClassName,
  placeholder = "Pilih opsi",
  disabled,
  ariaLabel = "Pilihan tersedia",
}: Props) {
  const reduce = useReducedMotion();
  const listboxId = useId();
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = Math.min(288, options.length * 46 + 12);
    const roomBelow = window.innerHeight - rect.bottom;
    const openUp = roomBelow < estimatedHeight + 16 && rect.top > roomBelow;
    setPosition({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: Math.max(rect.width, 180),
      openUp,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onViewportChange() {
      updatePosition();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, updatePosition]);

  function nextEnabled(index: number, direction: 1 | -1) {
    if (!options.length) return -1;
    let next = index;
    for (let count = 0; count < options.length; count += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) return next;
    }
    return -1;
  }

  function focusOption(index: number) {
    const nextIndex = options[index]?.disabled
      ? nextEnabled(index, 1)
      : ((index % options.length) + options.length) % options.length;
    if (nextIndex < 0) return;
    setActiveIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }

  function openAt(index: number) {
    if (disabled || !options.length) return;
    const normalized = index < 0 ? 0 : index;
    setOpen(true);
    window.requestAnimationFrame(() => focusOption(normalized));
  }

  function selectOption(option: SelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const menu = (
    <AnimatePresence>
      {open && position && (
        <motion.div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          initial={reduce ? false : { opacity: 0, y: position.openUp ? 7 : -7, scale: 0.98 }}
          animate={{ opacity: 1, y: position.openUp ? "-100%" : 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: position.openUp ? -8 : -6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: open ? EASE_OUT : EASE_IN_OUT }}
          style={{ position: "fixed", top: position.top, left: position.left, width: position.width }}
          className="z-[100001] max-h-72 overflow-y-auto rounded-xl border border-blue-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(7,43,107,0.2)]"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = activeIndex === index;
            return (
              <button
                ref={(node) => { optionRefs.current[index] = node; }}
                id={`${listboxId}-option-${index}`}
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                tabIndex={isActive ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusOption(nextEnabled(index, 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusOption(nextEnabled(index, -1));
                  }
                  if (event.key === "Home") { event.preventDefault(); focusOption(0); }
                  if (event.key === "End") { event.preventDefault(); focusOption(options.length - 1); }
                  if (event.key === "Tab") setOpen(false);
                }}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-600 hover:bg-slate-50"
                } ${isActive ? "ring-2 ring-inset ring-blue-200" : ""}`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected && (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-lime text-brand-navy">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-slate-400">Tidak ada pilihan</p>
          )}
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
        onClick={() => (open ? setOpen(false) : openAt(Math.max(0, selectedIndex)))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); openAt(Math.max(0, selectedIndex)); }
          if (event.key === "ArrowUp") { event.preventDefault(); openAt(selectedIndex - 1); }
          if (event.key === "Home") { event.preventDefault(); openAt(0); }
          if (event.key === "End") { event.preventDefault(); openAt(options.length - 1); }
        }}
        className={buttonClassName ?? "flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition duration-200 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"}
      >
        <span className={`truncate ${selected ? "" : "text-slate-400"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-blue-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {mounted ? createPortal(menu, document.body) : null}
    </div>
  );
}
