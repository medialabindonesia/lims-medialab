"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Headset, Inbox, Search, UserCheck } from "lucide-react";
import { fadeUp } from "@/lib/motion";
import {
  formatRelative,
  isOpenStatus,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type SupportTicketDTO,
} from "@/lib/support";
import { PriorityBadge, TicketStatusBadge } from "@/components/support/Badges";
import { useSupportUnread } from "@/hooks/useSupportUnread";

type AssignedFilter = "all" | "me" | "unassigned";

export default function SupportDeskClient({
  initialTickets,
  agentId,
}: {
  initialTickets: SupportTicketDTO[];
  agentId: string;
}) {
  const reduce = useReducedMotion();
  const [tickets, setTickets] = useState(initialTickets);
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [assigned, setAssigned] = useState<AssignedFilter>("all");
  const [q, setQ] = useState("");

  const refetch = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (priority !== "ALL") params.set("priority", priority);
    if (assigned !== "all") params.set("assigned", assigned);
    if (q.trim()) params.set("q", q.trim());

    try {
      const res = await fetch(`/api/support/tickets?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch {
      /* diamkan */
    }
  }, [status, priority, assigned, q]);

  // Refetch saat filter berubah (debounce ringan untuk search).
  useEffect(() => {
    const t = setTimeout(refetch, 250);
    return () => clearTimeout(t);
  }, [refetch]);

  // Realtime: refetch daftar saat ada tiket baru / update dari kanal desk.
  useSupportUnread({ isCustomer: false, onNotify: refetch });

  const openCount = tickets.filter((t) => isOpenStatus(t.status)).length;
  const mineCount = tickets.filter((t) => t.assignedToId === agentId).length;
  const unassignedCount = tickets.filter((t) => !t.assignedToId).length;

  return (
    <section className="min-h-screen">
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
        className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white">
            <Headset size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-600">Support Desk</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Antrian Tiket
            </h1>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-400">Tiket Aktif</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{openCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-400">Ditugaskan ke Saya</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{mineCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-400">Belum Ditugaskan</p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {unassignedCount}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Cari subjek / no tiket / customer"
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(["all", "me", "unassigned"] as AssignedFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAssigned(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                assigned === option
                  ? "bg-emerald-500 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {option === "all"
                ? "Semua"
                : option === "me"
                ? "Saya"
                : "Belum ditugaskan"}
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        >
          <option value="ALL">Semua Status</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        >
          <option value="ALL">Semua Prioritas</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Inbox size={32} className="text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Tidak ada tiket sesuai filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/desk/${ticket.id}`}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold text-slate-800">
                    {ticket.subject}
                  </p>
                  {(ticket.unreadForAgent ?? 0) > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {ticket.unreadForAgent}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {ticket.ticketNo} · {ticket.customerName || "-"} ·{" "}
                  {formatRelative(ticket.lastMessageAt)}
                </p>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                {ticket.assignedToName ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    <UserCheck size={12} />
                    {ticket.assignedToName}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Belum ditugaskan
                  </span>
                )}
              </div>

              <PriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={ticket.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
