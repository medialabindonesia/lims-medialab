"use client";

import { Wifi, WifiOff } from "lucide-react";

export default function PresenceStatus({
  selfOnline,
  opponentOnline,
  opponentLabel,
}: {
  selfOnline: boolean;
  opponentOnline: boolean;
  opponentLabel: string;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5 text-[10px] font-bold" aria-live="polite">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${selfOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {selfOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
        Anda {selfOnline ? "online" : "offline"}
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${opponentOnline ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${opponentOnline ? "bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.7)]" : "bg-slate-400"}`} />
        {opponentLabel} {opponentOnline ? "online" : "offline"}
      </span>
    </div>
  );
}
