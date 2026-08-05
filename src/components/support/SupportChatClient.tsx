"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  type ChatMessage,
  type SupportMessageDTO,
  type SupportAttachmentDTO,
  type SupportTicketDTO,
} from "@/lib/support";
import {
  applyRead,
  ingestReal,
  makeOptimistic,
  markFailed,
  removeByKey,
} from "@/lib/chat-messages";
import { TicketStatusBadge } from "@/components/support/Badges";
import ChatThread from "@/components/support/ChatThread";
import ChatComposer from "@/components/support/ChatComposer";
import StarRating from "@/components/support/StarRating";
import { useTicketChannel } from "@/hooks/useTicketChannel";
import PresenceStatus from "@/components/support/PresenceStatus";

export default function SupportChatClient({
  initialTicket,
  initialMessages,
  viewerId,
  viewerName,
}: {
  initialTicket: SupportTicketDTO;
  initialMessages: SupportMessageDTO[];
  viewerId: string;
  viewerName: string;
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [typingName, setTypingName] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const appendMessage = useCallback((incoming: SupportMessageDTO) => {
    // Customer tidak boleh melihat internal note (pertahanan tambahan).
    if (incoming.isInternalNote) return;
    setMessages((prev) => ingestReal(prev, incoming));
  }, []);

  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/support/tickets/${ticket.id}/read`, { method: "POST" });
    } catch {
      /* diamkan */
    }
  }, [ticket.id]);

  const { selfOnline, opponentOnline, opponentNames, publishTyping } = useTicketChannel(ticket.id, {
    onMessage: (message) => {
      appendMessage(message);
      if (message.senderRole === "AGENT") markRead();
    },
    onTicketUpdate: ({ ticket: updated, message }) => {
      setTicket(updated);
      if (message) appendMessage(message);
    },
    onTyping: (payload) => {
      if (payload.role === "AGENT") {
        setTypingName(payload.name);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingName(null), 3000);
      }
    },
    onRead: ({ reader, at }) => {
      // Agent membaca pesan customer → tandai pesan customer sebagai dibaca.
      if (reader !== "AGENT") return;
      setMessages((prev) => applyRead(prev, "AGENT", at));
    },
  }, { userId: viewerId, name: viewerName, role: "CUSTOMER" });

  useEffect(() => {
    markRead();
  }, [markRead]);

  // Optimistic: pesan langsung tampil, dikirim di latar belakang.
  const sendMessage = useCallback(
    (body: string, attachments: SupportAttachmentDTO[] = []) => {
      const optimistic = makeOptimistic({
        ticketId: ticket.id,
        senderRole: "CUSTOMER",
        senderName: ticket.customerName || "Anda",
        body,
        isInternalNote: false,
        attachments,
      });
      setMessages((prev) => [...prev, optimistic]);

      void (async () => {
        try {
          const res = await fetch(
            `/api/support/tickets/${ticket.id}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body, attachments }),
            }
          );
          const data = await res.json();
          if (res.ok && data.message) {
            setMessages((prev) => ingestReal(prev, data.message));
            if (data.ticket) setTicket(data.ticket);
          } else {
            setMessages((prev) => markFailed(prev, optimistic.clientKey!));
          }
        } catch {
          setMessages((prev) => markFailed(prev, optimistic.clientKey!));
        }
      })();
    },
    [ticket.id, ticket.customerName]
  );

  function handleRetry(message: ChatMessage) {
    setMessages((prev) => removeByKey(prev, message.clientKey ?? message.id));
    sendMessage(message.body, message.attachments);
  }

  async function submitRating() {
    if (rating < 1) return;
    setRatingSubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, ratingComment }),
      });
      const data = await res.json();
      if (res.ok && data.ticket) setTicket(data.ticket);
    } finally {
      setRatingSubmitting(false);
    }
  }

  const closed = ticket.status === "CLOSED";
  const resolved = ticket.status === "RESOLVED";
  const alreadyRated = ticket.rating != null;

  return (
    // Tinggi TETAP (bukan min-height) relatif viewport, dikurangi ruang
    // shell dashboard (padding + top bar mobile). Ini yang membuat kotak
    // chat di bawah punya batas nyata sehingga overflow-y-auto-nya bisa
    // aktif — hanya kotak chat yang scroll, bukan seluruh halaman.
    <section className="flex h-[calc(100dvh-8.5rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      {/* Header */}
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/support"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-slate-900">
              {ticket.subject}
            </h1>
            <p className="text-xs text-slate-400">
              {ticket.ticketNo}
              {ticket.categoryName ? ` · ${ticket.categoryName}` : ""}
            </p>
            <p className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#114DA5]">
              {ticket.contextType === "GENERAL"
                ? "Umum · pra-pemesanan"
                : ticket.contextType === "QUOTATION"
                  ? `Quotation · ${ticket.quotationNo || ticket.contextLabel}`
                  : ticket.contextType === "RESULT_REVISION"
                    ? `Revisi hasil · #${ticket.revisionNo || "-"}`
                    : `Pesanan / sample · ${ticket.sampleNo || ticket.contextLabel}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PresenceStatus
            selfOnline={selfOnline}
            opponentOnline={opponentOnline}
            opponentLabel={opponentNames[0] || "Tim support"}
          />
          <TicketStatusBadge status={ticket.status} />
        </div>
      </div>

      {/* Rating panel (resolved) */}
      {resolved && !alreadyRated && (
        <div className="mb-4 shrink-0 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-900">
            <CheckCircle2 size={18} />
            <p className="font-bold">Tiket ini ditandai selesai</p>
          </div>
          <p className="mt-1 text-sm text-amber-700">
            Beri penilaian atas bantuan kami. Setelah dinilai, tiket akan ditutup.
          </p>
          <div className="mt-3">
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            value={ratingComment}
            onChange={(event) => setRatingComment(event.target.value)}
            rows={2}
            placeholder="Komentar (opsional)"
            className="mt-3 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={submitRating}
            disabled={rating < 1 || ratingSubmitting}
            className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {ratingSubmitting ? "Mengirim…" : "Kirim Penilaian"}
          </button>
        </div>
      )}

      {closed && alreadyRated && (
        <div className="mb-4 flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-600">
            Penilaian Anda:
          </p>
          <StarRating value={ticket.rating ?? 0} readOnly size={18} />
        </div>
      )}

      {/* Thread — min-h-0 wajib agar flex-1 benar-benar dibatasi (bukan
          mengikuti tinggi konten), sehingga overflow-y-auto di dalamnya aktif. */}
      <div className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <ChatThread
          messages={messages}
          viewer="customer"
          typingName={typingName}
          emptyHint="Mulai percakapan dengan tim kami."
          onRetry={handleRetry}
        />
      </div>

      {/* Composer */}
      <div className="mt-4 shrink-0">
        {closed ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
            Tiket sudah ditutup. Buat tiket baru dari Support Center bila
            diperlukan.
          </div>
        ) : (
          <ChatComposer
            ticketId={ticket.id}
            onSend={(body, _internal, attachments) =>
              sendMessage(body, attachments)
            }
            onTyping={() =>
              publishTyping({
                name: ticket.customerName || "Customer",
                role: "CUSTOMER",
              })
            }
          />
        )}
      </div>
    </section>
  );
}
