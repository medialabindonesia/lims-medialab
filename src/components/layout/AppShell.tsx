"use client";

import Sidebar, {
  type DashboardMenuItem,
  type DashboardSession,
} from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";
import WorkspaceTopbar from "@/components/layout/WorkspaceTopbar";

type AppShellProps = {
  session: DashboardSession;
  menus: DashboardMenuItem[];
  children: React.ReactNode;
};

export default function AppShell({ session, menus, children }: AppShellProps) {
  return (
    <div className="dashboard-canvas min-h-screen bg-slate-50 text-slate-900">
      <Sidebar session={session} menus={menus} />

      <div className="min-h-screen transition-[margin] duration-300 lg:ml-[var(--sidebar-width)]">
        <WorkspaceTopbar session={session} menus={menus} />
        <main className="px-3 pb-24 pt-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6 xl:px-8">
          <div className="mx-auto max-w-[96rem]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
