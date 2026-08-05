"use client";

import type { ElementType } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  FileBadge,
  FilePlus,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  PackageCheck,
  Receipt,
  Search,
  Send,
  ShoppingBag,
  ThumbsDown,
  ThumbsUp,
  UserCog,
} from "lucide-react";
import { fadeUp, staggerContainer, fadeUpItem } from "@/lib/motion";
import {
  formatRelative,
  type FaqCategoryDTO,
  type FaqItemDTO,
  type SupportTicketDTO,
} from "@/lib/support";
import { TicketStatusBadge } from "@/components/support/Badges";
import { useSupportUnread } from "@/hooks/useSupportUnread";
import { reauthAbly } from "@/lib/ably-client";
import Select from "@/components/ui/Select";

const categoryIcons: Record<string, ElementType> = {
  FilePlus,
  PackageCheck,
  FileBadge,
  Receipt,
  UserCog,
  HelpCircle,
};

function CategoryIcon({ name }: { name: string | null }) {
  const Icon = (name && categoryIcons[name]) || HelpCircle;
  return <Icon size={22} />;
}

function FaqAccordionItem({ item }: { item: FaqItemDTO }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<"none" | "sending" | "done">("none");

  async function sendFeedback(helpful: boolean) {
    if (feedback !== "none") return;
    setFeedback("sending");
    try {
      await fetch(`/api/support/faq/${item.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful }),
      });
      setFeedback("done");
    } catch {
      setFeedback("none");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-sm font-bold text-slate-800">
          {item.question}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3.5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {item.answer}
          </p>

          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
            {feedback === "done" ? (
              <p className="text-xs font-semibold text-emerald-600">
                Terima kasih atas masukannya!
              </p>
            ) : (
              <>
                <span className="text-xs text-slate-400">
                  Apakah ini membantu?
                </span>
                <button
                  type="button"
                  onClick={() => sendFeedback(true)}
                  disabled={feedback === "sending"}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <ThumbsUp size={13} /> Ya
                </button>
                <button
                  type="button"
                  onClick={() => sendFeedback(false)}
                  disabled={feedback === "sending"}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
                >
                  <ThumbsDown size={13} /> Tidak
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportCenterClient({
  faq,
  initialTickets,
  customerId,
  contexts,
  initialContextType,
  initialContextId,
  initialContextLabel,
}: {
  faq: FaqCategoryDTO[];
  initialTickets: SupportTicketDTO[];
  customerId: string;
  contexts: {
    quotations: Array<{
      id: string;
      quotationNo: string;
      status: string;
    }>;
    samples: Array<{
      id: string;
      sampleNo: string;
      status: string;
      quotation?: { quotationNo: string } | null;
    }>;
    revisions: Array<{
      id: string;
      sampleNo: string;
      revisionNo: number;
      action: string;
      changeSummary?: string | null;
    }>;
  };
  initialContextType?: string;
  initialContextId?: string;
  initialContextLabel?: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [tickets, setTickets] = useState(initialTickets);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategoryDTO | null>(
    null
  );
  const [composing, setComposing] = useState(
    !!initialContextType && initialContextType !== "GENERAL"
  );
  const [subject, setSubject] = useState(
    initialContextLabel
      ? `Bantuan: ${initialContextLabel}`
      : initialContextType === "QUOTATION"
      ? "Bantuan Quotation"
      : initialContextType === "ORDER_SAMPLE"
      ? "Bantuan Pesanan / Sample"
      : initialContextType === "RESULT_REVISION"
      ? "Bantuan Revisi Hasil"
      : ""
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextType, setContextType] = useState<
    "GENERAL" | "QUOTATION" | "ORDER_SAMPLE" | "RESULT_REVISION"
  >(
    initialContextType === "QUOTATION" ||
      initialContextType === "ORDER_SAMPLE" ||
      initialContextType === "RESULT_REVISION"
      ? initialContextType
      : "GENERAL"
  );
  const [contextId, setContextId] = useState(
    initialContextId || ""
  );

  async function refetchTickets() {
    try {
      const res = await fetch("/api/support/tickets", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch {
      /* diamkan */
    }
  }

  const { count: unread } = useSupportUnread({
    isCustomer: true,
    customerId,
    onNotify: refetchTickets,
  });

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ category: string; item: FaqItemDTO }> = [];
    for (const category of faq) {
      for (const item of category.items) {
        if (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
        ) {
          results.push({ category: category.name, item });
        }
      }
    }
    return results;
  }, [faq, query]);

  function openCompose(category: FaqCategoryDTO | null) {
    setActiveCategory(category);
    setComposing(true);
    setSubject(category ? `Bantuan: ${category.name}` : "");
    setMessage("");
    setContextType("GENERAL");
    setContextId("");
    setError(null);
  }

  async function submitTicket() {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (trimmedSubject.length < 3) {
      setError("Subjek minimal 3 karakter.");
      return;
    }
    if (!trimmedMessage) {
      setError("Pesan tidak boleh kosong.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: trimmedSubject,
          message: trimmedMessage,
          categoryId: activeCategory?.id ?? null,
          contextType,
          contextId: contextType === "GENERAL" ? null : contextId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal membuat tiket.");
        return;
      }
      // Refresh token Ably supaya kanal tiket baru masuk capability.
      await reauthAbly();
      router.push(`/support/tickets/${data.ticket.id}`);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  }

  const showingTopic = activeCategory && !composing;

  return (
    <section className="min-h-screen">
      {/* Header */}
      <motion.div
        variants={reduce ? undefined : fadeUp}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
        className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-emerald-500 to-sky-500 p-8 text-white shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <LifeBuoy size={26} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">Support Center</p>
            <h1 className="text-3xl font-black tracking-tight">
              Ada yang bisa kami bantu?
            </h1>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <Search size={20} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pertanyaan… (mis. invoice, sample, COA)"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
          />
        </div>
      </motion.div>

      {/* Compose new ticket */}
      {composing ? (
        <motion.div
          variants={reduce ? undefined : fadeUp}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "visible"}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setComposing(false)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Kembali
          </button>

          <h2 className="text-2xl font-black text-slate-900">
            Chat dengan Customer Service
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {activeCategory
              ? `Topik: ${activeCategory.name}. `
              : ""}
            Jelaskan kebutuhan Anda, tim kami akan segera membantu.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Konteks percakapan
              </label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    value: "GENERAL" as const,
                    label: "Pertanyaan umum",
                    hint: "Konsultasi sebelum order",
                    icon: MessageCircle,
                  },
                  {
                    value: "QUOTATION" as const,
                    label: "Quotation",
                    hint: "Bahas penawaran tertentu",
                    icon: FileBadge,
                  },
                  {
                    value: "ORDER_SAMPLE" as const,
                    label: "Pesanan / sample",
                    hint: "Komplain atau hasil uji",
                    icon: ShoppingBag,
                  },
                  {
                    value: "RESULT_REVISION" as const,
                    label: "Revisi hasil",
                    hint: "Bahas versi hasil tertentu",
                    icon: FileBadge,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setContextType(option.value);
                        setContextId("");
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        contextType === option.value
                          ? "border-[#114DA5] bg-blue-50 ring-1 ring-[#114DA5]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={17} className="text-[#114DA5]" />
                      <p className="mt-2 text-xs font-black text-slate-800">
                        {option.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
              {contextType !== "GENERAL" && (
                <Select
                  value={contextId}
                  onChange={setContextId}
                  options={[
                    {
                      value: "",
                      label:
                        contextType === "QUOTATION"
                          ? "Pilih quotation..."
                          : contextType === "RESULT_REVISION"
                            ? "Pilih revisi hasil..."
                            : "Pilih pesanan / sample...",
                    },
                    ...(contextType === "QUOTATION"
                      ? contexts.quotations.map((item) => ({
                          value: item.id,
                          label: `${item.quotationNo} · ${item.status}`,
                        }))
                      : contextType === "RESULT_REVISION"
                        ? contexts.revisions.map((item) => ({
                            value: item.id,
                            label: `${item.sampleNo} · Revisi ${item.revisionNo} · ${item.action}`,
                          }))
                        : contexts.samples.map((item) => ({
                            value: item.id,
                            label: `${item.sampleNo}${item.quotation ? ` · ${item.quotation.quotationNo}` : ""} · ${item.status}`,
                          }))),
                  ]}
                  ariaLabel="Konteks tiket"
                  className="mt-3 w-full"
                  buttonClassName="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-800 outline-none"
                />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Subjek
              </label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ringkas masalah Anda"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Pesan
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="Tuliskan detail pertanyaan / kendala Anda…"
                className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submitTicket}
              disabled={
                submitting || (contextType !== "GENERAL" && !contextId)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
            >
              <Send size={16} />
              {submitting ? "Mengirim…" : "Mulai Chat"}
            </button>
          </div>
        </motion.div>
      ) : showingTopic ? (
        /* Topic view: FAQ accordion + escalate CTA */
        <motion.div
          variants={reduce ? undefined : fadeUp}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "visible"}
        >
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Semua topik
          </button>

          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CategoryIcon name={activeCategory.icon} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {activeCategory.name}
              </h2>
              {activeCategory.description && (
                <p className="text-sm text-slate-500">
                  {activeCategory.description}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {activeCategory.items.map((item) => (
              <FaqAccordionItem key={item.id} item={item} />
            ))}
            {activeCategory.items.length === 0 && (
              <p className="text-sm text-slate-400">
                Belum ada FAQ untuk topik ini.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Masih butuh bantuan?
              </p>
              <p className="text-sm text-emerald-700">
                Chat langsung dengan Customer Service kami.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCompose(activeCategory)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <MessageCircle size={16} /> Chat CS
            </button>
          </div>
        </motion.div>
      ) : query.trim() ? (
        /* Search results */
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-500">
            {searchResults.length} hasil untuk “{query.trim()}”
          </p>
          {searchResults.map(({ category, item }) => (
            <div key={item.id}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                {category}
              </p>
              <FaqAccordionItem item={item} />
            </div>
          ))}
          {searchResults.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-500">
                Tidak ada FAQ yang cocok.
              </p>
              <button
                type="button"
                onClick={() => openCompose(null)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
              >
                <MessageCircle size={16} /> Chat dengan CS
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Home: topic cards + my tickets */
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 text-lg font-black text-slate-900">
              Pilih topik masalah
            </h2>
            <motion.div
              variants={reduce ? undefined : staggerContainer()}
              initial={reduce ? undefined : "hidden"}
              animate={reduce ? undefined : "visible"}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {faq.map((category) => (
                <motion.button
                  key={category.id}
                  variants={reduce ? undefined : fadeUpItem}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110">
                    <CategoryIcon name={category.icon} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{category.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                      {category.description || `${category.items.length} pertanyaan`}
                    </p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                Tiket Saya
                {unread > 0 && (
                  <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    {unread} baru
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => openCompose(null)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-600"
              >
                <MessageCircle size={15} /> Tiket baru
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">
                  Belum ada tiket. Mulai dari topik di atas atau buat tiket baru.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/support/tickets/${ticket.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-slate-800">
                          {ticket.subject}
                        </p>
                        {(ticket.unreadForCustomer ?? 0) > 0 && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {ticket.ticketNo} · {formatRelative(ticket.lastMessageAt)}
                      </p>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
