"use client";

import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/layout/PageTransition";

type MenuItem = {
  id: string;
  name: string;
  key: string;
  href: string;
  icon?: string | null;
};

type AppShellProps = {
  user: {
    name: string;
    email: string;
    roleName: string;
  };
  menus: MenuItem[];
  children: React.ReactNode;
};

export default function AppShell({ user, menus, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar user={user} menus={menus} />

      <main className="min-h-screen pl-72">
        <div className="mx-auto max-w-7xl px-8 py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}