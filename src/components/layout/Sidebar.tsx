"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { staggerContainer, fadeUpItem, SPRING_SOFT } from "@/lib/motion";
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
  const reduce = useReducedMotion();

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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="shrink-0 px-5 py-6">
        <motion.div
          className="mb-6 flex items-center gap-3"
          initial={reduce ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <FlaskConical size={22} />
          </div>

          <div>
            <h1 className="font-bold">LIMS-Medialab</h1>
            <p className="text-xs text-slate-400">Medialab Workflow</p>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-4"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{user.roleName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
        </motion.div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pr-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
        <motion.div
          className="space-y-6"
          variants={staggerContainer(0.04, 0.12)}
          initial={reduce ? false : "hidden"}
          animate="visible"
        >
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
                    <motion.div key={menu.id} variants={fadeUpItem}>
                      <Link
                        href={menu.href}
                        className={[
                          "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                          active
                            ? "text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        ].join(" ")}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active-pill"
                            className="absolute inset-0 -z-10 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20"
                            transition={
                              reduce
                                ? { duration: 0 }
                                : SPRING_SOFT
                            }
                          />
                        )}
                        <Icon
                          size={18}
                          className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                        />
                        <span className="truncate">{menu.name}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-5">
        <motion.button
          onClick={handleLogout}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={18} />
          Logout
        </motion.button>
      </div>
    </aside>
  );
}