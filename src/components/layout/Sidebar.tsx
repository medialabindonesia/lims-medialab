"use client";

import type { ElementType } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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

const groupConfig: Record<
  string,
  {
    label: string;
    sort: number;
  }
> = {
  dashboard: {
    label: "Dashboard",
    sort: 1,
  },
  admin: {
    label: "Administration",
    sort: 2,
  },
  master: {
    label: "Master Data",
    sort: 3,
  },
  quotation: {
    label: "Quotation",
    sort: 4,
  },
  sales: {
    label: "Sales",
    sort: 5,
  },
  technical: {
    label: "Technical",
    sort: 6,
  },
  lab: {
    label: "Laboratory",
    sort: 7,
  },
  coa: {
    label: "Certificate / COA",
    sort: 8,
  },
  finance: {
    label: "Finance",
    sort: 9,
  },
  support: {
    label: "Support",
    sort: 10,
  },
  customer: {
    label: "Customer Area",
    sort: 11,
  },
};

function getMenuGroupKey(menuKey: string) {
  return menuKey.split(".")[0] || "other";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
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
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-5 py-5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="group flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-sm">
            <FlaskConical size={25} />
          </div>

          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">
              LIMS-Medialab
            </p>
            <p className="text-xs font-medium text-slate-500">
              Laboratory Workflow
            </p>
          </div>
        </Link>
      </div>

      <div className="shrink-0 px-5 py-4">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-sm font-black text-white">
              {getInitials(session.name)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">
                {session.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {session.roleName}
              </p>
            </div>
          </div>

          {session.customerName && (
            <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-slate-500">
              Customer: {session.customerName}
            </p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4 pr-3">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="sticky top-0 z-10 bg-white/95 px-3 py-2 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
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
                      className={[
                        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all",
                        active
                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      ].join(" ")}
                    >
                      <Icon
                        size={18}
                        className={[
                          "shrink-0",
                          active
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-700",
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
                                ? "bg-white/25 text-white"
                                : "bg-red-500 text-white",
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

      <div className="shrink-0 border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
        >
          <LogOut size={17} />
          Logout
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          © 2026 LIMS-Medialab
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

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 border-r border-slate-200 bg-white shadow-sm lg:block">
        <SidebarContent
          menus={menus}
          session={session}
          supportBadge={supportBadge}
        />
      </aside>

      <div className="sticky top-0 z-30 mb-4 flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white">
            <FlaskConical size={22} />
          </div>

          <div>
            <p className="text-sm font-black text-slate-900">LIMS-Medialab</p>
            <p className="text-xs text-slate-500">{session.roleName}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="rounded-2xl border border-slate-200 p-2 text-slate-600"
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
            className="fixed inset-0 z-[9999] bg-slate-900/50 p-4 backdrop-blur-md lg:hidden"
          >
            <motion.div
              initial={reduce ? false : { x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduce ? undefined : { x: -24, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative h-full w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setOpenMobile(false)}
                className="absolute right-4 top-4 z-10 rounded-2xl bg-slate-100 p-2 text-slate-600"
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