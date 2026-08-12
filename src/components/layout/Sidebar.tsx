"use client";

import type { ElementType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BadgeDollarSign,
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  FileBadge,
  FileCheck,
  FilePenLine,
  FilePlus,
  FileSignature,
  FileText,
  FlaskConical,
  Headset,
  HelpCircle,
  History,
  Home,
  KeyRound,
  LifeBuoy,
  ListChecks,
  LogOut,
  Microscope,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  RefreshCcw,
  SearchCheck,
  Share2,
  Shield,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useSupportUnread } from "@/hooks/useSupportUnread";
import { EASE_OUT } from "@/lib/motion";

export type DashboardMenuItem = {
  id: string;
  name: string;
  key: string;
  href: string;
  icon?: string | null;
  sort: number;
};

export type DashboardSession = {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  customerId?: string | null;
  customerName?: string | null;
};

type MenuGroup = {
  key: string;
  label: string;
  sort: number;
  items: DashboardMenuItem[];
};

const iconMap: Record<string, ElementType> = {
  Award,
  BadgeCheck,
  BadgeDollarSign,
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  FileBadge,
  FileCheck,
  FilePenLine,
  FilePlus,
  FileSignature,
  FileText,
  FlaskConical,
  Headset,
  HelpCircle,
  History,
  KeyRound,
  LifeBuoy,
  ListChecks,
  Microscope,
  PackageCheck,
  Receipt,
  RefreshCcw,
  SearchCheck,
  Share2,
  Shield,
  UserCog,
  Users,
  Wallet,
};

const groupConfig: Record<string, { label: string; sort: number }> = {
  dashboard: { label: "Ringkasan", sort: 1 },
  marketing: { label: "Marketing", sort: 2 },
  quotation: { label: "Quotation", sort: 3 },
  sales: { label: "Sales", sort: 4 },
  technical: { label: "Teknis", sort: 5 },
  lab: { label: "Pengujian", sort: 6 },
  coa: { label: "COA", sort: 7 },
  finance: { label: "Finance", sort: 8 },
  master: { label: "Master Data", sort: 9 },
  audit: { label: "Mutu & Audit", sort: 10 },
  admin: { label: "Administrasi", sort: 11 },
  support: { label: "Bantuan", sort: 12 },
  customer: { label: "Customer", sort: 13 },
};

function getGroupKey(key: string) {
  return key.split(".")[0] || "other";
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ML"
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  menus,
  session,
  collapsed,
  onNavigate,
  supportBadge,
}: {
  menus: DashboardMenuItem[];
  session: DashboardSession;
  collapsed: boolean;
  onNavigate?: () => void;
  supportBadge?: { key: string; count: number };
}) {
  const pathname = usePathname();
  const router = useRouter();

  const groups = useMemo<MenuGroup[]>(() => {
    const map = new Map<string, MenuGroup>();
    for (const menu of menus) {
      const key = getGroupKey(menu.key);
      const config = groupConfig[key] || { label: "Lainnya", sort: 99 };
      const current = map.get(key);
      if (current) current.items.push(menu);
      else map.set(key, { key, ...config, items: [menu] });
    }
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.sort - b.sort),
      }))
      .sort((a, b) => a.sort - b.sort);
  }, [menus]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-white text-slate-700">
      <div className="flex h-[4.25rem] shrink-0 items-center border-b border-slate-200 px-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`flex min-w-0 items-center ${collapsed ? "w-full justify-center" : "px-1"}`}
        >
          <Image
            src="/images/logo-medialab.png"
            alt="Medialab Indonesia"
            width={220}
            height={66}
            priority
            className={collapsed ? "h-auto w-11 object-contain object-left" : "h-auto w-[9.5rem] object-contain object-left"}
          />
          <span className="sr-only">Medialab Indonesia</span>
        </Link>
      </div>

      <nav aria-label="Navigasi utama" className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              {collapsed ? (
                <div className="mx-2 mb-2 border-t border-slate-200" />
              ) : (
                <p className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {group.label}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon && iconMap[item.icon] ? iconMap[item.icon] : Home;
                  const active = isActivePath(pathname, item.href);
                  const badge = supportBadge?.key === item.key ? supportBadge.count : 0;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.name : undefined}
                      className={`group relative flex min-h-10 items-center rounded-xl text-[13px] font-semibold transition-colors duration-150 ${
                        collapsed ? "justify-center px-2" : "gap-3 px-3"
                      } ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-indicator"
                          className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-blue-600"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <Icon
                        size={17}
                        strokeWidth={active ? 2.25 : 1.8}
                        className={`shrink-0 ${
                          active ? "text-blue-700" : "text-slate-500 group-hover:text-slate-700"
                        }`}
                      />
                      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{item.name}</span>
                      {badge > 0 && (
                        <span
                          className={`rounded-full bg-blue-700 text-center font-black text-white ${
                            collapsed
                              ? "absolute right-0.5 top-0.5 min-w-4 px-1 text-[8px] leading-4"
                              : "min-w-5 px-1.5 text-[9px] leading-5"
                          }`}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-2.5">
        <div className={`flex items-center rounded-xl ${collapsed ? "justify-center p-1" : "gap-2.5 p-2"}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-[11px] font-black text-white">
            {getInitials(session.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{session.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">{session.roleName}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={logout}
              aria-label="Keluar"
              title="Keluar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  menus,
  session,
}: {
  menus: DashboardMenuItem[];
  session: DashboardSession;
}) {
  const reduce = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isCustomer = session.roleCode === "CUSTOMER_ENGAGEMENT";
  const supportKey = menus.find(
    (menu) => menu.key === "support.center" || menu.key === "support.desk"
  )?.key;
  const { count: supportUnread } = useSupportUnread({
    isCustomer,
    customerId: session.customerId,
    enabled: Boolean(supportKey),
  });
  const supportBadge = supportKey
    ? { key: supportKey, count: supportUnread }
    : undefined;

  useEffect(() => {
    const saved = window.localStorage.getItem("medialab.sidebar.collapsed");
    const frame = window.requestAnimationFrame(() => {
      if (saved === "true") setCollapsed(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "4.75rem" : "15.5rem"
    );
    window.localStorage.setItem("medialab.sidebar.collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function openNavigation() {
      setMobileOpen(true);
    }
    window.addEventListener("medialab:open-navigation", openNavigation);
    return () => window.removeEventListener("medialab:open-navigation", openNavigation);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden overflow-visible border-r border-slate-200 bg-white transition-[width] duration-300 lg:block ${
          collapsed ? "w-[4.75rem]" : "w-[15.5rem]"
        }`}
      >
        <SidebarContent
          menus={menus}
          session={session}
          collapsed={collapsed}
          supportBadge={supportBadge}
        />
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Perluas sidebar" : "Ringkas sidebar"}
          title={collapsed ? "Perluas sidebar" : "Ringkas sidebar"}
          className="absolute -right-3 top-[5.1rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
        >
          {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setMobileOpen(false);
            }}
            className="fixed inset-0 z-[9999] bg-slate-950/35 backdrop-blur-sm lg:hidden"
          >
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi LIMS"
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="relative h-full w-[min(86vw,19rem)] border-r border-slate-200 bg-white shadow-[18px_0_50px_rgba(15,42,73,0.18)]"
            >
              <button
                ref={closeRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup navigasi"
                className="workspace-icon-button absolute right-3 top-3 z-10"
              >
                <X size={17} />
              </button>
              <SidebarContent
                menus={menus}
                session={session}
                collapsed={false}
                supportBadge={supportBadge}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
