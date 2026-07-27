"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Lock,
  RotateCw,
} from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { formatChatTime, type ChatMessage } from "@/lib/support";

type Props = {
  messages: ChatMessage[];
  viewer: "customer" | "agent";
  typingName?: string | null;
  emptyHint?: string;
  onRetry?: (message: ChatMessage) => void;
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ChatThread({
  messages,
  viewer,
  typingName,
  emptyHint,
  onRetry,
}: Props) {
  const reduce = useReducedMotion();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingName]);

  // Entrance: fade + naik + motion blur mereda (ease-out).
  const enter = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12, filter: "blur(8px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: { duration: 0.35, ease: EASE_OUT },
      };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-2">
      {messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">
            {emptyHint || "Belum ada pesan."}
          </p>
        </div>
      )}

      {messages.map((message) => {
        const key = message.clientKey ?? message.id;

        if (message.senderRole === "SYSTEM") {
          return (
            <motion.div key={key} {...enter} className="flex justify-center">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {message.body}
              </span>
            </motion.div>
          );
        }

        // Pesan "milik" viewer tampil di kanan.
        const isOwn =
          (viewer === "customer" && message.senderRole === "CUSTOMER") ||
          (viewer === "agent" && message.senderRole === "AGENT");

        const isInternal = message.isInternalNote;

        // Tanda "dibaca" hanya untuk pesan milik viewer sendiri (bukan internal).
        const readByOther =
          viewer === "customer"
            ? message.readByAgentAt != null
            : message.readByCustomerAt != null;
        const showReadMark = isOwn && !isInternal;

        return (
          <motion.div
            key={key}
            {...enter}
            className={`flex items-end gap-2.5 ${
              isOwn ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                message.senderRole === "AGENT"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {initials(message.senderName)}
            </div>

            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-opacity ${
                message.pending ? "opacity-70" : "opacity-100"
              } ${
                isInternal
                  ? "border border-amber-200 bg-amber-50 text-amber-900"
                  : isOwn
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              } ${message.failed ? "ring-1 ring-red-300" : ""}`}
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                <span
                  className={`text-xs font-bold ${
                    isInternal
                      ? "text-amber-700"
                      : isOwn
                      ? "text-white/90"
                      : "text-slate-500"
                  }`}
                >
                  {message.senderName || "-"}
                </span>
                {isInternal && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    <Lock size={10} />
                    Catatan internal
                  </span>
                )}
              </div>

              {message.attachments.length > 0 && (
                <div className="mb-2 grid gap-2">
                  {message.attachments.map((attachment, index) => {
                    if (attachment.kind === "IMAGE") {
                      return (
                        <a
                          key={attachment.id || `${attachment.url}-${index}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl bg-slate-900/10"
                        >
                          {/* Blob URL dinamis; native img menjaga preview tanpa allowlist host. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachment.url}
                            alt={attachment.fileName}
                            className="max-h-72 w-full object-cover"
                            loading="lazy"
                          />
                          <span className="block truncate px-2 py-1.5 text-[11px] opacity-80">
                            {attachment.fileName} · {fileSize(attachment.sizeBytes)}
                            {attachment.isCompressed ? " · HD optimized" : ""}
                          </span>
                        </a>
                      );
                    }
                    if (attachment.kind === "VIDEO") {
                      return (
                        <div
                          key={attachment.id || `${attachment.url}-${index}`}
                          className="overflow-hidden rounded-xl bg-slate-950"
                        >
                          <video
                            controls
                            preload="metadata"
                            className="max-h-72 w-full"
                          >
                            <source
                              src={attachment.url}
                              type={attachment.mimeType}
                            />
                          </video>
                          <p className="truncate px-2 py-1.5 text-[11px] text-white/75">
                            {attachment.fileName} · {fileSize(attachment.sizeBytes)}
                          </p>
                        </div>
                      );
                    }
                    if (attachment.kind === "AUDIO") {
                      return (
                        <div
                          key={attachment.id || `${attachment.url}-${index}`}
                          className="rounded-xl bg-slate-950/10 p-2"
                        >
                          <audio controls preload="metadata" className="w-full">
                            <source
                              src={attachment.url}
                              type={attachment.mimeType}
                            />
                          </audio>
                          <p className="mt-1 truncate text-[11px] opacity-75">
                            {attachment.fileName} · {fileSize(attachment.sizeBytes)}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <a
                        key={attachment.id || `${attachment.url}-${index}`}
                        href={attachment.downloadUrl || attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          isOwn
                            ? "border-white/20 bg-white/10"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <FileText size={22} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold">
                            {attachment.fileName}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {fileSize(attachment.sizeBytes)}
                          </span>
                        </span>
                        <Download size={16} />
                      </a>
                    );
                  })}
                </div>
              )}

              {message.body && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.body}
                </p>
              )}

              <div
                className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                  isInternal
                    ? "text-amber-600"
                    : isOwn
                    ? "text-white/70"
                    : "text-slate-400"
                }`}
              >
                <span>{formatChatTime(message.createdAt)}</span>

                {message.pending ? (
                  <span title="Mengirim…" className="flex items-center">
                    <Clock size={12} />
                  </span>
                ) : message.failed ? (
                  <button
                    type="button"
                    onClick={() => onRetry?.(message)}
                    className="flex items-center gap-0.5 font-bold text-red-100 underline decoration-red-200 underline-offset-2"
                  >
                    <RotateCw size={11} /> Gagal · coba lagi
                  </button>
                ) : showReadMark ? (
                  readByOther ? (
                    <span
                      title="Dibaca"
                      className="flex items-center font-semibold text-sky-200"
                    >
                      <CheckCheck size={13} />
                    </span>
                  ) : (
                    <span title="Terkirim" className="flex items-center">
                      <Check size={13} />
                    </span>
                  )
                ) : null}
              </div>
            </div>
          </motion.div>
        );
      })}

      {typingName && (
        <div className="flex items-center gap-2 px-2 text-xs text-slate-400">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
          </span>
          {typingName} sedang mengetik…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
