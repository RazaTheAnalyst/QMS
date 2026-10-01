"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconMenu2, IconMoon, IconSun, IconLogout, IconSearch,
  IconBell, IconChevronDown, IconCalendar,
} from "@tabler/icons-react";
import { useAuth } from "@/components/auth-provider";
import { NAV_LINKS } from "@/components/shell/sidebar";
import { cn } from "@/lib/utils";

function displayName(email?: string | null, fallback = "User") {
  const base = (email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  return base ? base.replace(/\b\w/g, (c) => c.toUpperCase()) : fallback;
}

const ROLE_BADGE: Record<string, string> = {
  Admin: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Logistics: "bg-[#1976d2]/10 text-[#1565c0] dark:text-[#90caf9]",
  Sales: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

export function Topbar({ onMenu, pending = 0, role = "Sales" }: { onMenu: () => void; pending?: number; role?: string }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  const [term, setTerm] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const name = displayName(user?.email, "Admin");
  const title = NAV_LINKS.find((l) => l.to === pathname)?.label ?? "Overview";
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setProfileOpen(false);
    };
    const onDoc = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("qms-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const goSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    router.push(`/quotations?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#e6ebf2] bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#171d1b]/90">
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1600px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <button onClick={onMenu} aria-label="Toggle menu" className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
          <IconMenu2 size={18} />
        </button>

        <div className="min-w-0 shrink-0">
          <p className="hidden text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:block">Welcome {name}</p>
          <h1 className="truncate text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{title}</h1>
        </div>

        <span className="hidden items-center gap-1.5 rounded-full bg-[#1976d2]/10 px-3 py-1.5 text-xs font-bold text-[#1976d2] lg:inline-flex dark:text-[#90caf9]">
          <IconCalendar size={14} /> {today}
        </span>

        <form onSubmit={goSearch} className="mx-auto hidden w-full max-w-md items-center md:flex">
          <div className="relative w-full">
            <IconSearch size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search supplier, PO, forwarder…"
              className="h-10 w-full rounded-full border border-[#e6ebf2] bg-[#f6f9fd] pl-10 pr-14 text-sm font-medium shadow-[inset_0_1px_2px_rgba(16,24,40,0.05)] placeholder:font-normal placeholder:text-slate-400 focus:border-[#1976d2] focus:outline-none focus:ring-4 focus:ring-[#1976d2]/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md border border-[#e6ebf2] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400 dark:border-white/15 dark:bg-white/5">⌘K</kbd>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/quotations"
            title={pending > 0 ? `${pending} pending approvals` : "No pending approvals"}
            className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <IconBell size={18} />
            {pending > 0 && (
              <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-[#171d1b]">
                {pending > 99 ? "99+" : pending}
              </span>
            )}
          </Link>
          <button onClick={toggle} aria-label="Toggle theme" className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <span className="mx-0.5 hidden h-8 w-px bg-[#e6ebf2] sm:block dark:bg-white/10" />

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-1 transition hover:border-[#e6ebf2] hover:bg-slate-50 sm:pr-2 dark:hover:border-white/10 dark:hover:bg-white/5"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1976d2] to-[#42a5f5] text-sm font-extrabold text-white shadow">
                {name.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#171d1b]" />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[110px] truncate text-sm font-bold leading-tight text-slate-900 dark:text-white">{name}</span>
                <span className={cn("mt-0.5 inline-block rounded-full px-1.5 text-[10px] font-extrabold", ROLE_BADGE[role] ?? ROLE_BADGE.Sales)}>{role}</span>
              </span>
              <IconChevronDown size={15} className={cn("hidden text-slate-400 transition-transform sm:block", profileOpen && "rotate-180")} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-[#e6ebf2] bg-white shadow-[0_24px_60px_-20px_rgba(16,24,40,0.4)] dark:border-white/10 dark:bg-[#1a221f]">
                <div className="flex items-center gap-3 border-b border-[#e6ebf2] bg-[#f6f9fd] px-4 py-3.5 dark:border-white/10 dark:bg-white/5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1976d2] to-[#42a5f5] font-extrabold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold dark:text-white">{name}</span>
                    <span className="block truncate text-xs text-slate-500" title={user?.email ?? ""}>{user?.email}</span>
                    <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold", ROLE_BADGE[role] ?? ROLE_BADGE.Sales)}>{role}</span>
                  </span>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { setProfileOpen(false); toggle(); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    {dark ? <IconSun size={16} /> : <IconMoon size={16} />} Switch to {dark ? "light" : "dark"} mode
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[#c2412d] hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <IconLogout size={16} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
