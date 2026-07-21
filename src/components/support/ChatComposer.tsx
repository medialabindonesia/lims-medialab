"use client";

import { useRef, useState } from "react";
import { Lock, MessageSquareText, Send } from "lucide-react";
import type { CannedReplyDTO } from "@/lib/support";

type Props = {
  onSend: (body: string, isInternalNote: boolean) => Promise<void> | void;
  onTyping?: () => void;
  disabled?: boolean;
  /** Agent-only: izinkan internal note + canned replies. */
  allowInternalNote?: boolean;
  cannedReplies?: CannedReplyDTO[];
  placeholder?: string;
};

export default function ChatComposer({
  onSend,
  onTyping,
  disabled,
  allowInternalNote,
  cannedReplies,
  placeholder,
}: Props) {
  const [value, setValue] = useState("");
  const [internal, setInternal] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Optimistic: bersihkan input SEKARANG, kirim di latar (jangan tunggu server).
  // Tombol/textarea tak pernah nge-freeze — terasa snappy seperti WhatsApp.
  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    const noteFlag = internal;
    setValue("");
    setInternal(false);
    onSend(trimmed, noteFlag);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-3 shadow-sm transition-colors ${
        internal ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
      }`}
    >
      {allowInternalNote && cannedReplies && cannedReplies.length > 0 && (
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => setShowCanned((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <MessageSquareText size={14} />
            Balasan cepat
          </button>

          {showCanned && (
            <div className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {cannedReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => {
                    setValue((prev) =>
                      prev ? `${prev}\n${reply.body}` : reply.body
                    );
                    setShowCanned(false);
                    textareaRef.current?.focus();
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                >
                  <p className="text-xs font-bold text-slate-700">
                    {reply.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {reply.body}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={
            placeholder ||
            (internal ? "Tulis catatan internal…" : "Tulis pesan…")
          }
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>

      {allowInternalNote && (
        <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={internal}
            onChange={(event) => setInternal(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-amber-500"
          />
          <span className="inline-flex items-center gap-1">
            <Lock size={12} />
            Kirim sebagai catatan internal (tidak terlihat customer)
          </span>
        </label>
      )}
    </div>
  );
}
