"use client";

import type { ReactNode } from "react";
import Sidebar, {
  type DashboardMenuItem,
  type DashboardSession,
} from "./Sidebar";
import PageTransition from "./PageTransition";
import WorkspaceTopbar from "./WorkspaceTopbar";
import SupportChatFab from "@/components/support/SupportChatFab";

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

      <div className="min-h-screen transition-[margin] duration-300 lg:ml-[var(--sidebar-width)]">
        <WorkspaceTopbar menus={menus} session={session} />
        <main
          id="main-content"
          tabIndex={-1}
          className="px-3 pb-24 pt-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6 xl:px-8"
        >
          <div className="mx-auto w-full max-w-[96rem]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {session.roleCode === "CUSTOMER_ENGAGEMENT" && <SupportChatFab />}
    </div>
  );
}
