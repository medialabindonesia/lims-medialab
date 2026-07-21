"use client";

import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { formatChatTime, type SupportMessageDTO } from "@/lib/support";

type Props = {
  messages: SupportMessageDTO[];
  viewer: "customer" | "agent";
  typingName?: string | null;
  emptyHint?: string;
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

export default function ChatThread({
  messages,
  viewer,
  typingName,
  emptyHint,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingName]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-1 py-2">
      {messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400">
            {emptyHint || "Belum ada pesan."}
          </p>
        </div>
      )}

      {messages.map((message) => {
        if (message.senderRole === "SYSTEM") {
          return (
            <div key={message.id} className="flex justify-center">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {message.body}
              </span>
            </div>
          );
        }

        // Pesan "milik" viewer tampil di kanan.
        const isOwn =
          (viewer === "customer" && message.senderRole === "CUSTOMER") ||
          (viewer === "agent" && message.senderRole === "AGENT");

        const isInternal = message.isInternalNote;

        return (
          <div
            key={message.id}
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
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                isInternal
                  ? "border border-amber-200 bg-amber-50 text-amber-900"
                  : isOwn
                  ? "bg-emerald-500 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
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

              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.body}
              </p>

              <p
                className={`mt-1 text-right text-[10px] ${
                  isInternal
                    ? "text-amber-600"
                    : isOwn
                    ? "text-white/70"
                    : "text-slate-400"
                }`}
              >
                {formatChatTime(message.createdAt)}
              </p>
            </div>
          </div>
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
