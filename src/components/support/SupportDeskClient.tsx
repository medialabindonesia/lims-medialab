"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Headset, Inbox, Loader2, UserCheck } from "lucide-react";
import { fadeUp } from "@/lib/motion";
import {
  formatRelative,
  formatShortDate,
  isOpenStatus,
  DATE_PRESET_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPagination,
  type SupportTicketDTO,
} from "@/lib/support";
import { PriorityBadge, TicketStatusBadge } from "@/components/support/Badges";
import { useSupportUnread } from "@/hooks/useSupportUnread";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import TicketSearchBox from "@/components/support/TicketSearchBox";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/support/DateRangePicker";
import Pagination from "@/components/support/Pagination";

type AssignedFilter = "all" | "me" | "unassigned";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  ...TICKET_STATUSES.map((s) => ({ value: s, label: s })),
];

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "Semua Prioritas" },
  ...TICKET_PRIORITIES.map((p) => ({ value: p, label: p })),
];

export default function SupportDeskClient({
  initialTickets,
  initialPagination,
  agentId,
}: {
  initialTickets: SupportTicketDTO[];
  initialPagination: TicketPagination;
  agentId: string;
}) {
  const reduce = useReducedMotion();
  const [tickets, setTickets] = useState(initialTickets);
  const [pagination, setPagination] = useState(initialPagination);
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [assigned, setAssigned] = useState<AssignedFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "ALL",
    from: null,
    to: null,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(true); // data awal sudah dari server

  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(
    async (targetPage: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (priority !== "ALL") params.set("priority", priority);
      if (assigned !== "all") params.set("assigned", assigned);
      if (dateRange.from) params.set("dateFrom", dateRange.from);
      if (dateRange.to) params.set("dateTo", dateRange.to);
      params.set("page", String(targetPage));

      setLoading(true);
      try {
        const res = await fetch(`/api/support/tickets?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setTickets(data.tickets ?? []);
        if (data.pagination) setPagination(data.pagination);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          /* diamkan — request lain yang lebih baru akan menggantikan */
        }
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
          setFirstLoadDone(true);
        }
      }
    },
    [status, priority, assigned, dateRange]
  );

  // Filter berubah → kembali ke halaman 1 + refetch (debounce ringan).
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setPage(1);
    const t = setTimeout(() => refetch(1), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, assigned, dateRange]);

  function goToPage(nextPage: number) {
    setPage(nextPage);
    refetch(nextPage);
  }

  // Realtime: refetch halaman aktif saat ada tiket baru / update dari kanal desk.
  useSupportUnread({ isCustomer: false, onNotify: () => refetch(page) });

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
            <p className="text-xs font-semibold text-slate-400">
              Tiket (halaman ini)
            </p>
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
        <TicketSearchBox />

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

        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <Select
          value={priority}
          onChange={setPriority}
          options={PRIORITY_OPTIONS}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />

        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Loader2 size={13} className="animate-spin" />
            Memuat…
          </span>
        )}
      </div>

      {dateRange.preset !== "ALL" && (
        <p className="mb-3 text-xs text-slate-400">
          Menampilkan tiket dibuat pada:{" "}
          <span className="font-semibold text-slate-600">
            {dateRange.preset === "CUSTOM"
              ? `${dateRange.from} – ${dateRange.to}`
              : DATE_PRESET_LABELS[dateRange.preset]}
          </span>
        </p>
      )}

      {/* List */}
      {!firstLoadDone ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Inbox size={32} className="text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Tidak ada tiket sesuai filter.
          </p>
        </div>
      ) : (
        <div
          className={`space-y-3 transition-opacity ${
            loading ? "pointer-events-none opacity-60" : "opacity-100"
          }`}
        >
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
                  {formatShortDate(ticket.createdAt)} ·{" "}
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

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onChange={goToPage}
      />
    </section>
  );
}
