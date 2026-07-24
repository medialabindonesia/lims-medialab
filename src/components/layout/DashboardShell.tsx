"use client";

import type { ReactNode } from "react";
import Sidebar, { type DashboardMenuItem, type DashboardSession } from "./Sidebar";
import PageTransition from "./PageTransition";

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
    <div className="dashboard-canvas min-h-screen bg-slate-50 text-slate-900">
      <a href="#main-content" className="skip-link">
        Lewati navigasi
      </a>

      <Sidebar menus={menus} session={session} />

      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen px-4 pb-8 pt-1 transition-[margin,padding] duration-300 lg:ml-80 lg:px-8 lg:py-8 xl:px-10"
      >
        <div className="mx-auto w-full max-w-[90rem]">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
