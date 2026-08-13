"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import StatusBadge from "@/components/ui/StatusBadge";
import SurfaceCard from "@/components/ui/SurfaceCard";
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  X,
} from "lucide-react";

interface EmailHistoryItem {
  id: string;
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED";
  toEmail: string;
  ccEmails: string[] | null;
  subject: string;
  sentAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  sentByName: string | null;
}

interface EmailHistoryProps {
  quotationId: string;
  trigger?: React.ReactNode;
}

function formatStatus(status: EmailHistoryItem["status"]) {
  switch (status) {
    case "DRAFT":
      return { label: "Draf", tone: "neutral" as const, icon: Clock };
    case "SENDING":
      return { label: "Mengirim...", tone: "info" as const, icon: Clock };
    case "SENT":
      return { label: "Terkirim", tone: "success" as const, icon: CheckCircle };
    case "FAILED":
      return { label: "Gagal", tone: "error" as const, icon: XCircle };
  }
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function QuotationEmailHistory({
  quotationId,
  trigger,
}: EmailHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState<EmailHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch email history when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function fetchEmails() {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/quotations/${quotationId}/emails`);
        if (!res.ok) throw new Error("Gagal memuat riwayat email");
        const data = await res.json();
        if (!cancelled) {
          setEmails(data.emails || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat");
          setIsLoading(false);
        }
      }
    }

    fetchEmails();

    return () => { cancelled = true; };
  }, [isOpen, quotationId]);

  const close = () => setIsOpen(false);

  const dialog = mounted ? (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) close();
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-2 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,42,73,0.24)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-black text-slate-900">Riwayat Email</h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup"
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto p-5 space-y-3">
              {isLoading && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Memuat riwayat email...
                </div>
              )}

              {error && (
                <div className="text-center py-8 text-red-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {!isLoading && !error && emails.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Belum ada email yang dikirim
                </div>
              )}

              {!isLoading && !error && emails.length > 0 &&
                emails.map((email) => {
                  const statusInfo = formatStatus(email.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <SurfaceCard key={email.id}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                          <span className="text-sm text-slate-500">
                            {formatDateTime(email.sentAt || email.createdAt)}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-slate-500">Ke: </span>
                          <span className="font-medium text-slate-900">{email.toEmail}</span>
                          {email.ccEmails && email.ccEmails.length > 0 && (
                            <span className="text-slate-500">
                              {" "}(CC: {email.ccEmails.join(", ")})
                            </span>
                          )}
                        </div>

                        {email.subject && (
                          <div className="text-sm">
                            <span className="text-slate-500">Subjek: </span>
                            <span className="text-slate-900">{email.subject}</span>
                          </div>
                        )}

                        {email.sentByName && (
                          <div className="text-sm text-slate-500 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Dikirim oleh: {email.sentByName}
                          </div>
                        )}
                      </div>

                      {email.status === "FAILED" && email.lastError && (
                        <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                          <strong>Error:</strong> {email.lastError}
                        </div>
                      )}
                      </div>
                    </SurfaceCard>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  ) : null;

  return (
    <>
      {trigger || (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Mail className="h-4 w-4" />
          Riwayat Email
        </button>
      )}
      {mounted && createPortal(dialog, document.body)}
    </>
  );
}
