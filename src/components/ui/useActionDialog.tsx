"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";

export type ActionDialogField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  options?: Array<{ value: string; label: string }>;
};

type DialogConfig = {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  fields: ActionDialogField[];
};

type Values = Record<string, string>;
type DialogRequest = DialogConfig & { values: Values };

const subscribe = () => () => {};

export function useActionDialog() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const reduce = useReducedMotion();
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [error, setError] = useState("");
  const resolver = useRef<((values: Values | null) => void) | null>(null);

  const prompt = useCallback((config: DialogConfig) => {
    return new Promise<Values | null>((resolve) => {
      resolver.current?.(null);
      resolver.current = resolve;
      setError("");
      setRequest({
        ...config,
        values: Object.fromEntries(
          config.fields.map((field) => [field.name, field.defaultValue || ""])
        ),
      });
    });
  }, []);

  const close = useCallback(() => {
    resolver.current?.(null);
    resolver.current = null;
    setRequest(null);
    setError("");
  }, []);

  function submit() {
    if (!request) return;
    for (const field of request.fields) {
      const value = request.values[field.name]?.trim() || "";
      if (field.required && !value) {
        setError(`${field.label} wajib diisi.`);
        return;
      }
      if (field.minLength && value.length < field.minLength) {
        setError(`${field.label} minimal ${field.minLength} karakter.`);
        return;
      }
    }
    resolver.current?.(request.values);
    resolver.current = null;
    setRequest(null);
    setError("");
  }

  const dialog = mounted
    ? createPortal(
        <AnimatePresence>
          {request && (
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) close();
              }}
              className="fixed inset-0 z-[100002] flex items-end justify-center bg-slate-950/35 p-2 backdrop-blur-sm sm:items-center sm:p-4"
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.985 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,42,73,0.24)]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{request.title}</h2>
                    {request.description && <p className="mt-1 text-xs leading-5 text-slate-500">{request.description}</p>}
                  </div>
                  <button type="button" onClick={close} aria-label="Tutup" className="workspace-icon-button h-9 w-9"><X size={16} /></button>
                </div>

                <div className="space-y-4 p-5">
                  {request.fields.map((field) => (
                    <label key={field.name} className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </span>
                      {field.type === "textarea" ? (
                        <textarea
                          autoFocus={request.fields[0]?.name === field.name}
                          rows={4}
                          value={request.values[field.name] || ""}
                          placeholder={field.placeholder}
                          onChange={(event) => setRequest((current) => current ? { ...current, values: { ...current.values, [field.name]: event.target.value } } : current)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                        />
                      ) : field.type === "select" ? (
                        <select
                          autoFocus={request.fields[0]?.name === field.name}
                          value={request.values[field.name] || ""}
                          onChange={(event) => setRequest((current) => current ? { ...current, values: { ...current.values, [field.name]: event.target.value } } : current)}
                          className="w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                        >
                          <option value="">Pilih...</option>
                          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      ) : (
                        <input
                          autoFocus={request.fields[0]?.name === field.name}
                          type={field.type || "text"}
                          value={request.values[field.name] || ""}
                          placeholder={field.placeholder}
                          onChange={(event) => setRequest((current) => current ? { ...current, values: { ...current.values, [field.name]: event.target.value } } : current)}
                          className="w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                        />
                      )}
                    </label>
                  ))}
                  {error && <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                  <button type="button" onClick={close} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Batal</button>
                  <button type="button" onClick={submit} className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white ${request.tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-700 hover:bg-blue-800"}`}>{request.confirmLabel || "Lanjutkan"}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

  return { prompt, dialog };
}
