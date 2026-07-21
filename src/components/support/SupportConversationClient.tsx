"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Star,
  UserCheck,
  UserPlus,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  PRIORITY_STYLES,
  TICKET_PRIORITIES,
  formatChatTime,
  type CannedReplyDTO,
  type SupportMessageDTO,
  type SupportTicketDTO,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support";
import { PriorityBadge, TicketStatusBadge } from "@/components/support/Badges";
import ChatThread from "@/components/support/ChatThread";
import ChatComposer from "@/components/support/ChatComposer";
import { useTicketChannel } from "@/hooks/useTicketChannel";

const STATUS_ACTIONS: { status: TicketStatus; label: string }[] = [
  { status: "IN_PROGRESS", label: "Proses" },
  { status: "WAITING_CUSTOMER", label: "Tunggu Customer" },
  { status: "RESOLVED", label: "Selesai" },
];

export default function SupportConversationClient({
  initialTicket,
  initialMessages,
  cannedReplies,
  agentId,
}: {
  initialTicket: SupportTicketDTO;
  initialMessages: SupportMessageDTO[];
  cannedReplies: CannedReplyDTO[];
  agentId: string;
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendMessage = useCallback((incoming: SupportMessageDTO) => {
    setMessages((prev) =>
      prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
    );
  }, []);

  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/support/tickets/${ticket.id}/read`, { method: "POST" });
    } catch {
      /* diamkan */
    }
  }, [ticket.id]);

  const { connected, publishTyping } = useTicketChannel(ticket.id, {
    onMessage: (message) => {
      appendMessage(message);
      if (message.senderRole === "CUSTOMER") markRead();
    },
    onTicketUpdate: ({ ticket: updated, message }) => {
      setTicket(updated);
      if (message) appendMessage(message);
    },
    onTyping: (payload) => {
      if (payload.role === "CUSTOMER") {
        setTypingName(payload.name);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingName(null), 3000);
      }
    },
    onRead: ({ reader, at }) => {
      // Customer membaca pesan agent → tandai pesan agent sebagai dibaca.
      if (reader !== "CUSTOMER") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderRole === "AGENT" && !m.readByCustomerAt
            ? { ...m, readByCustomerAt: at }
            : m
        )
      );
    },
  });

  useEffect(() => {
    markRead();
  }, [markRead]);

  async function handleSend(body: string, isInternalNote: boolean) {
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, isInternalNote }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        appendMessage(data.message);
        if (data.ticket) setTicket(data.ticket);
      }
    } finally {
      setSending(false);
    }
  }

  async function patchTicket(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setTicket(data.ticket);
        if (data.systemMessage) appendMessage(data.systemMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  const assignedToMe = ticket.assignedToId === agentId;
  const closed = ticket.status === "CLOSED";

  return (
    <section className="min-h-screen">
      <div className="mb-4">
        <Link
          href="/support/desk"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Antrian
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Conversation */}
        <div className="flex min-h-[70vh] flex-col">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900">
                {ticket.subject}
              </h1>
              <p className="text-xs text-slate-400">
                {ticket.ticketNo}
                {ticket.categoryName ? ` · ${ticket.categoryName}` : ""}
              </p>
            </div>
            <span
              title={connected ? "Realtime aktif" : "Realtime offline"}
              className={connected ? "text-emerald-500" : "text-slate-300"}
            >
              {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            </span>
          </div>

          <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <ChatThread
              messages={messages}
              viewer="agent"
              typingName={typingName}
              emptyHint="Belum ada percakapan."
            />
          </div>

          <div className="mt-3">
            {closed ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
                Tiket sudah ditutup.
              </div>
            ) : (
              <ChatComposer
                onSend={handleSend}
                sending={sending}
                allowInternalNote
                cannedReplies={cannedReplies}
                onTyping={() =>
                  publishTyping({ name: "Customer Service", role: "AGENT" })
                }
              />
            )}
          </div>
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Status
            </p>
            <div className="flex items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>

            {!closed && (
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    disabled={busy || ticket.status === action.status}
                    onClick={() => patchTicket({ status: action.status })}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Penugasan
            </p>
            {ticket.assignedToName ? (
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                <UserCheck size={14} /> {ticket.assignedToName}
              </p>
            ) : (
              <p className="mb-3 text-sm text-amber-600">Belum ditugaskan</p>
            )}

            {!closed &&
              (assignedToMe ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patchTicket({ unassign: true })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Lepas penugasan
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patchTicket({ assignToMe: true })}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  <UserPlus size={15} /> Tugaskan ke saya
                </button>
              ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Prioritas
            </p>
            <select
              value={ticket.priority}
              disabled={busy || closed}
              onChange={(event) =>
                patchTicket({ priority: event.target.value as TicketPriority })
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:opacity-50"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_STYLES[p].label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
              Customer
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Building2 size={14} /> {ticket.customerName || "-"}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Dibuat {formatChatTime(ticket.createdAt)}
            </p>
            {ticket.rating != null && (
              <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-amber-500">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {ticket.rating}/5
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
