"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BadgeDollarSign,
  Briefcase,
  Building2,
  CheckCheck,
  ClipboardCheck,
  ClipboardPen,
  FileBadge,
  FileCheck,
  FilePenLine,
  FilePlus,
  FileText,
  FlaskConical,
  KeyRound,
  ListChecks,
  Microscope,
  PackageCheck,
  Receipt,
  RefreshCcw,
  SearchCheck,
  Share2,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  LogOut,
} from "lucide-react";

const icons = {
  Shield,
  Briefcase,
  Users,
  Wallet,
  FlaskConical,
  KeyRound,
  UserCog,
  Building2,
  ListChecks,
  FilePlus,
  FileCheck,
  FilePenLine,
  BadgeCheck,
  FileText,
  ClipboardCheck,
  PackageCheck,
  Share2,
  Microscope,
  ClipboardPen,
  SearchCheck,
  CheckCheck,
  ShieldCheck,
  RefreshCcw,
  FileBadge,
  Award,
  Receipt,
  BadgeDollarSign,
};

type MenuItem = {
  id: string;
  name: string;
  key: string;
  href: string;
  icon?: string | null;
};

type SidebarProps = {
  user: {
    name: string;
    email: string;
    roleName: string;
  };
  menus: MenuItem[];
};

function getMenuGroup(menuKey: string) {
  const prefix = menuKey.split(".")[0];

  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    admin: "Administration",
    master: "Master Data",
    quotation: "Quotation",
    sales: "Sales",
    technical: "Technical",
    lab: "Laboratory",
    coa: "COA",
    finance: "Finance",
  };

  return labels[prefix] || "Other";
}

export default function Sidebar({ user, menus }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const groupedMenus = menus.reduce<Record<string, MenuItem[]>>((acc, menu) => {
    const group = getMenuGroup(menu.key);

    if (!acc[group]) {
      acc[group] = [];
    }

    acc[group].push(menu);

    return acc;
  }, {});

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/10 bg-slate-900/95 backdrop-blur-xl">
      <div className="shrink-0 px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <FlaskConical size={22} />
          </div>

          <div>
            <h1 className="font-bold">LIMS-Medialab</h1>
            <p className="text-xs text-slate-400">Medialab Workflow</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{user.roleName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pr-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <div className="space-y-6">
          {Object.entries(groupedMenus).map(([groupName, items]) => (
            <div key={groupName}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {groupName}
              </p>

              <div className="space-y-1">
                {items.map((menu) => {
                  const Icon = icons[menu.icon as keyof typeof icons] || Shield;
                  const active =
                    pathname === menu.href || pathname.startsWith(`${menu.href}/`);

                  return (
                    <Link
                      key={menu.id}
                      href={menu.href}
                      className={[
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                        active
                          ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20"
                          : "text-slate-300 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                    >
                      <Icon size={18} />
                      <span className="truncate">{menu.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-5">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}