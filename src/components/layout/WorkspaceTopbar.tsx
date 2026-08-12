"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import type {
  DashboardMenuItem,
  DashboardSession,
} from "@/components/layout/Sidebar";
import { EASE_OUT } from "@/lib/motion";

const groupLabels: Record<string, string> = {
  dashboard: "Ringkasan",
  admin: "Administrasi",
  master: "Master Data",
  marketing: "Marketing",
  quotation: "Quotation",
  sales: "Sales",
  technical: "Teknis",
  lab: "Pengujian",
  audit: "Audit",
  coa: "COA",
  finance: "Finance",
  support: "Bantuan",
  customer: "Customer",
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ML"
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function WorkspaceTopbar({
  menus,
  session,
}: {
  menus: DashboardMenuItem[];
  session: DashboardSession;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const activeMenu = useMemo(
    () =>
      [...menus]
        .sort((a, b) => b.href.length - a.href.length)
        .find((item) => isActive(pathname, item.href)),
    [menus, pathname]
  );
  const groupKey = activeMenu?.key.split(".")[0] || "dashboard";
  const groupLabel = groupLabels[groupKey] || "Workspace";
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return menus.slice(0, 7);
    return menus
      .filter((item) =>
        `${item.name} ${item.key}`.toLowerCase().includes(normalized)
      )
      .slice(0, 7);
  }, [menus, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function openResult(href: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <header className="workspace-topbar sticky top-0 z-30 flex h-[4.25rem] items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xl sm:px-5 lg:px-7">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("medialab:open-navigation"))}
        aria-label="Buka navigasi"
        className="workspace-icon-button lg:hidden"
      >
        <Menu size={18} />
      </button>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-xs md:flex">
        <span className="truncate font-bold text-blue-700">{groupLabel}</span>
        <ChevronRight size={13} className="shrink-0 text-slate-300" />
        <span className="truncate font-semibold text-slate-600">
          {activeMenu?.name || "Ringkasan"}
        </span>
      </nav>

      <button
        type="button"
        onClick={() => {
          setSearchOpen(true);
          window.requestAnimationFrame(() => searchRef.current?.focus());
        }}
        className="mx-auto flex h-10 min-w-0 max-w-[30rem] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs text-slate-400 transition hover:border-blue-300 hover:bg-slate-50 md:ml-auto md:mr-3 md:flex-none md:basis-[24rem]"
      >
        <Search size={16} className="shrink-0" />
        <span className="truncate">Cari menu atau halaman...</span>
        <span className="ml-auto hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 sm:inline">
          Ctrl K
        </span>
      </button>

      <button type="button" aria-label="Notifikasi" className="workspace-icon-button">
        <Bell size={17} />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          aria-expanded={profileOpen}
          className="flex min-h-10 items-center gap-2 rounded-xl px-1.5 text-left transition hover:bg-slate-50 sm:pr-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-[11px] font-black text-white">
            {initials(session.name)}
          </span>
          <span className="hidden min-w-0 xl:block">
            <span className="block max-w-32 truncate text-xs font-bold text-slate-800">
              {session.name}
            </span>
            <span className="block max-w-32 truncate text-[10px] text-slate-400">
              {session.roleName}
            </span>
          </span>
          <ChevronDown size={13} className="hidden text-slate-400 sm:block" />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: EASE_OUT }}
              className="absolute right-0 top-[calc(100%+0.6rem)] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,42,73,0.15)]"
            >
              <div className="border-b border-slate-100 px-3 py-2.5">
                <p className="truncate text-sm font-bold text-slate-800">{session.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{session.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={15} /> Keluar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setSearchOpen(false);
            }}
            className="fixed inset-0 z-[10000] flex items-start justify-center bg-slate-950/35 p-3 pt-[10vh] backdrop-blur-sm"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Cari halaman"
              initial={reduce ? false : { opacity: 0, y: -12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,42,73,0.24)]"
            >
              <label className="flex h-14 items-center gap-3 border-b border-slate-200 px-4">
                <Search size={18} className="text-blue-600" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ketik nama menu atau halaman..."
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:shadow-none"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="workspace-icon-button h-8 w-8">
                  <X size={15} />
                </button>
              </label>
              <div className="max-h-[25rem] overflow-y-auto p-2">
                {results.length ? (
                  results.map((item) => {
                    const itemGroup = groupLabels[item.key.split(".")[0]] || "Workspace";
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => openResult(item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-blue-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Search size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{item.name}</span>
                          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{itemGroup}</span>
                        </span>
                        <ChevronRight size={15} className="text-slate-300" />
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-10 text-center">
                    <UserRound size={24} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-600">Halaman tidak ditemukan</p>
                    <p className="mt-1 text-xs text-slate-400">Coba kata kunci yang lebih singkat.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
