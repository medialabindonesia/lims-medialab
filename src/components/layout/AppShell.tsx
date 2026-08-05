"use client";

import Sidebar, {
  type DashboardMenuItem,
  type DashboardSession,
} from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

type AppShellProps = {
  session: DashboardSession;
  menus: DashboardMenuItem[];
  children: React.ReactNode;
};

export default function AppShell({ session, menus, children }: AppShellProps) {
  return (
    <div className="dashboard-canvas min-h-screen bg-slate-50 text-slate-900">
      <Sidebar session={session} menus={menus} />

      <main className="min-h-screen px-3 pb-28 pt-4 sm:px-4 lg:ml-80 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[90rem]">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
