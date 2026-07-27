"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  FileClock,
  GitCompareArrows,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";

export type RevisionDTO = {
  id: string;
  entityType: "QUOTATION" | "LAB_RESULT";
  entityId: string;
  entityLabel: string;
  revisionNo: number;
  action: "CREATED" | "UPDATED" | "STATUS_TRANSITION" | "RESTORED";
  snapshot: Record<string, unknown>;
  checksum: string;
  integrityValid: boolean;
  changeSummary: string | null;
  reason: string | null;
  actorNameSnapshot: string | null;
  actorRoleSnapshot: string | null;
  restoredFromRevisionId: string | null;
  createdAt: string;
};

const actionLabel = {
  CREATED: "Baseline",
  UPDATED: "Revisi",
  STATUS_TRANSITION: "Perubahan status",
  RESTORED: "Restore",
};

export default function RevisionAuditClient({
  initialRevisions,
  canRestore,
}: {
  initialRevisions: RevisionDTO[];
  canRestore: boolean;
}) {
  const [revisions, setRevisions] = useState(initialRevisions);
  const [filter, setFilter] = useState<"ALL" | "QUOTATION" | "LAB_RESULT">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<RevisionDTO | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? revisions
        : revisions.filter((item) => item.entityType === filter),
    [filter, revisions]
  );

  async function restoreRevision() {
    if (!restoreTarget || reason.trim().length < 8) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(
      `/api/audit/revisions/${restoreTarget.id}/restore`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      }
    );
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.message || "Restore gagal");
      return;
    }
    const refreshed = await fetch("/api/audit/revisions", { cache: "no-store" });
    const refreshedData = await refreshed.json();
    if (refreshed.ok) {
      setRevisions(
        (refreshedData.revisions as RevisionDTO[]).map((item) => ({
          ...item,
          entityLabel:
            revisions.find(
              (old) =>
                old.entityType === item.entityType && old.entityId === item.entityId
            )?.entityLabel || item.entityId,
        }))
      );
    }
    setRestoreTarget(null);
    setReason("");
    setMessage(data.message);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(["ALL", "QUOTATION", "LAB_RESULT"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                filter === item
                  ? "bg-[#114DA5] text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {item === "ALL"
                ? "Semua"
                : item === "QUOTATION"
                  ? "Quotation"
                  : "Hasil Lab"}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          <ShieldCheck size={15} />
          Snapshot SHA-256 · append-only
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {message}
        </p>
      )}

      <div className="space-y-3">
        {visible.map((revision) => (
          <article
            key={revision.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#114DA5]">
                <FileClock size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-black text-slate-900">
                    {revision.entityLabel}
                  </h2>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-[#114DA5]">
                    Revisi {revision.revisionNo}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {actionLabel[revision.action]}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      revision.integrityValid
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    <BadgeCheck size={13} />
                    {revision.integrityValid ? "Checksum valid" : "Integritas gagal"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {revision.changeSummary || "Snapshot keadaan sistem"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {revision.actorNameSnapshot || "System"} ·{" "}
                  {new Date(revision.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(expanded === revision.id ? null : revision.id)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Detail <ChevronDown size={14} />
                </button>
                {canRestore && revision.integrityValid && (
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreTarget(revision);
                      setMessage(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#114DA5] px-3 py-2 text-xs font-bold text-white hover:bg-[#072B6B]"
                  >
                    <RotateCcw size={14} /> Gunakan revisi ini
                  </button>
                )}
              </div>
            </div>

            {expanded === revision.id && (
              <div className="border-t border-slate-100 bg-slate-50 p-5">
                {revision.reason && (
                  <p className="mb-3 text-sm text-slate-700">
                    <strong>Alasan:</strong> {revision.reason}
                  </p>
                )}
                <p className="mb-2 break-all font-mono text-[11px] text-slate-400">
                  SHA-256: {revision.checksum}
                </p>
                <pre className="max-h-80 overflow-auto rounded-xl bg-[#071C3D] p-4 text-xs leading-relaxed text-sky-100">
                  {JSON.stringify(revision.snapshot, null, 2)}
                </pre>
              </div>
            )}
          </article>
        ))}
        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Riwayat muncul otomatis saat quotation atau hasil laboratorium direvisi.
          </div>
        )}
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#114DA5]">
                  Controlled restore
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">
                  Gunakan revisi {restoreTarget.revisionNo}?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="rounded-xl bg-slate-100 p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <GitCompareArrows className="mt-0.5 shrink-0" size={18} />
              <p>
                Sistem tidak menghapus revisi setelahnya. Snapshot ini menjadi
                revisi terbaru dan seluruh approval terkait wajib diulang.
              </p>
            </div>
            <label className="mt-5 block text-sm font-bold text-slate-700">
              Alasan / referensi permintaan customer
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#114DA5]"
              placeholder="Contoh: Customer meminta kembali ke hasil revisi 5 melalui tiket TKT-..."
            />
            <button
              type="button"
              disabled={busy || reason.trim().length < 8}
              onClick={restoreRevision}
              className="mt-4 w-full rounded-xl bg-[#114DA5] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {busy ? "Memproses..." : "Buat revisi restore baru"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
