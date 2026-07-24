"use client";

import type { ElementType } from "react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  FileSignature,
  FileText,
  FlaskConical,
  Headset,
  HelpCircle,
  Home,
  KeyRound,
  LifeBuoy,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
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
  X,
} from "lucide-react";
import { useSupportUnread } from "@/hooks/useSupportUnread";

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
  Briefcase,
  Building2,
  CheckCheck,
  ClipboardCheck,
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
  dashboard: { label: "Dashboard", sort: 1 },
  admin: { label: "Administration", sort: 2 },
  master: { label: "Master Data", sort: 3 },
  quotation: { label: "Quotation", sort: 4 },
  sales: { label: "Sales", sort: 5 },
  technical: { label: "Technical", sort: 6 },
  lab: { label: "Laboratory", sort: 7 },
  coa: { label: "Certificate / COA", sort: 8 },
  finance: { label: "Finance", sort: 9 },
  support: { label: "Support", sort: 10 },
  customer: { label: "Customer Area", sort: 11 },
};

function getMenuGroupKey(menuKey: string) {
  return menuKey.split(".")[0] || "other";
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase())
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
  onClose,
  supportBadge,
}: {
  menus: DashboardMenuItem[];
  session: DashboardSession;
  onClose?: () => void;
  supportBadge?: { key: string; count: number };
}) {
  const pathname = usePathname();
  const router = useRouter();

  const groups = useMemo<MenuGroup[]>(() => {
    const map = new Map<string, MenuGroup>();

    for (const menu of menus) {
      const groupKey = getMenuGroupKey(menu.key);
      const config = groupConfig[groupKey] || {
        label: "Other",
        sort: 99,
      };
      const current = map.get(groupKey);

      if (current) {
        current.items.push(menu);
      } else {
        map.set(groupKey, {
          key: groupKey,
          label: config.label,
          sort: config.sort,
          items: [menu],
        });
      }
    }

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.sort - b.sort),
      }))
      .sort((a, b) => a.sort - b.sort);
  }, [menus]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-brand-navy text-white">
      <div className="shrink-0 border-b border-white/10 px-5 py-5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="group block rounded-2xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white px-3.5 py-2.5 shadow-[0_16px_40px_rgba(2,17,47,0.25)] transition duration-300 group-hover:-translate-y-0.5 lg:rounded-[1.4rem] lg:border-white/15 lg:bg-[linear-gradient(135deg,#ffffff_0%,#edf7ff_68%,#f3fae8_100%)] lg:px-4 lg:py-3 lg:shadow-[0_18px_48px_rgba(2,17,47,0.32)] lg:ring-1 lg:ring-white/10">
            <span
              className="pointer-events-none absolute inset-y-3 left-0 hidden w-1 rounded-r-full bg-gradient-to-b from-brand-sky via-blue-500 to-brand-lime lg:block"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute -right-8 -top-10 hidden h-24 w-24 rounded-full bg-brand-sky/15 lg:block"
              aria-hidden="true"
            />
            <Image
              src="/images/logo-medialab.png"
              alt="Medialab Indonesia"
              width={220}
              height={66}
              priority
              className="relative z-10 h-auto w-[12rem]"
            />
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-sky">
              LIMS Workspace
            </p>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-lime shadow-[0_0_10px_rgba(111,188,29,0.8)]" />
              Online
            </span>
          </div>
        </Link>
      </div>

      <div className="shrink-0 px-5 py-4">
        <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.07] p-4 shadow-inner shadow-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-lime text-sm font-black text-brand-navy shadow-[0_10px_25px_rgba(2,17,47,0.25)]">
              {getInitials(session.name)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-white">
                {session.name}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-brand-sky">
                {session.roleName}
              </p>
            </div>
          </div>

          {session.customerName && (
            <p className="mt-3 truncate rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-medium text-white/70">
              Customer: {session.customerName}
            </p>
          )}
        </div>
      </div>

      <nav
        aria-label="Navigasi utama"
        className="flex-1 overflow-y-auto px-4 pb-4 pr-3"
      >
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="sticky top-0 z-10 bg-brand-navy/95 px-3 py-2 backdrop-blur">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-sky/75">
                  {group.label}
                </p>
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon =
                    item.icon && iconMap[item.icon] ? iconMap[item.icon] : Home;
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all",
                        active
                          ? "bg-gradient-to-r from-brand-blue to-brand-deep text-white shadow-[0_12px_28px_rgba(2,17,47,0.25)]"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-lime shadow-[0_0_12px_rgba(111,188,29,0.65)]" />
                      )}

                      <Icon
                        size={18}
                        className={[
                          "shrink-0",
                          active
                            ? "text-brand-sky"
                            : "text-white/45 group-hover:text-brand-sky",
                        ].join(" ")}
                      />

                      <span className="truncate">{item.name}</span>

                      {supportBadge &&
                        supportBadge.key === item.key &&
                        supportBadge.count > 0 && (
                          <span
                            className={[
                              "ml-auto rounded-full px-2 py-0.5 text-xs font-bold",
                              active
                                ? "bg-brand-lime text-brand-navy"
                                : "bg-red-500 text-white shadow-sm",
                            ].join(" ")}
                          >
                            {supportBadge.count}
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

      <div className="shrink-0 border-t border-white/10 bg-[#062660] p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-200/30 hover:bg-red-400/20 hover:text-white"
        >
          <LogOut size={17} />
          Keluar
        </button>

        <p className="mt-3 text-center text-[11px] font-medium text-white/60">
          &copy; 2026 Medialab Indonesia
        </p>
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
  const [openMobile, setOpenMobile] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isCustomer = session.roleCode === "CUSTOMER_ENGAGEMENT";
  const supportKey = menus.find(
    (menu) => menu.key === "support.center" || menu.key === "support.desk",
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
    if (!openMobile) return;

    const previousOverflow = document.body.style.overflow;
    const openButton = openButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMobile(false);
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      openButton?.focus();
    };
  }, [openMobile]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 overflow-hidden bg-brand-navy shadow-[16px_0_45px_rgba(7,43,107,0.12)] lg:block">
        <SidebarContent
          menus={menus}
          session={session}
          supportBadge={supportBadge}
        />
      </aside>

      <div className="sticky top-0 z-30 mb-4 flex items-center justify-between border-b border-blue-100 bg-white/92 px-4 py-3 shadow-[0_8px_28px_rgba(7,43,107,0.08)] backdrop-blur-xl lg:hidden">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-3 rounded-xl"
        >
          <div className="rounded-xl border border-blue-100 bg-white px-2 py-1.5">
            <Image
              src="/images/logo-medialab.png"
              alt="Medialab Indonesia"
              width={142}
              height={43}
              priority
              className="h-auto w-[7.6rem] sm:w-[8.8rem]"
            />
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-extrabold uppercase tracking-[0.12em] text-blue-700">
              LIMS Workspace
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500">
              {session.roleName}
            </p>
          </div>
        </Link>

        <button
          ref={openButtonRef}
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Buka navigasi"
          aria-expanded={openMobile}
          aria-controls="mobile-navigation"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-800 transition hover:bg-blue-100"
        >
          <MenuIcon size={22} />
        </button>
      </div>

      <AnimatePresence>
        {openMobile && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setOpenMobile(false);
            }}
            className="fixed inset-0 z-[9999] bg-brand-navy/65 p-3 backdrop-blur-md sm:p-4 lg:hidden"
          >
            <motion.div
              id="mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi LIMS"
              initial={reduce ? false : { x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduce ? undefined : { x: -24, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative h-full w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/15 bg-brand-navy shadow-2xl"
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpenMobile(false)}
                aria-label="Tutup navigasi"
                className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-brand-navy/80 text-white transition hover:bg-white/15"
              >
                <X size={20} />
              </button>

              <SidebarContent
                menus={menus}
                session={session}
                supportBadge={supportBadge}
                onClose={() => setOpenMobile(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
