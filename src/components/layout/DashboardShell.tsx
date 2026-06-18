"use client";

import type { ReactNode } from "react";
import Sidebar, { type DashboardMenuItem, type DashboardSession } from "./Sidebar";

export default function DashboardShell({
  children,
  menus,
  session,
}: {
  children: ReactNode;
  menus: DashboardMenuItem[];
  session: DashboardSession;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar menus={menus} session={session} />

      <main className="min-h-screen px-4 py-5 transition-all duration-300 lg:ml-80 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}