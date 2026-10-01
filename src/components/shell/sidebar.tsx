"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconFileDescription,
  IconTruck,
  IconUsers,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { AppModule } from "@/lib/domain";

export const SIDEBAR_WIDTH = 272;
export const SIDEBAR_RAIL = 76;

export const NAV_LINKS: Array<{
  to: string;
  label: string;
  icon: typeof IconDashboard;
  color: string;
  bg: string;
  module: AppModule;
}> = [
  { to: "/", label: "Dashboard", icon: IconDashboard, color: "#42a5f5", bg: "rgba(49,116,143,0.10)", module: "dashboard" },
  { to: "/quotations", label: "Quotations", icon: IconFileDescription, color: "#1976d2", bg: "rgba(25,118,210,0.10)", module: "quotations" },
  { to: "/forwarders", label: "Forwarders", icon: IconTruck, color: "#b7791f", bg: "rgba(183,121,31,0.12)", module: "forwarders" },
  { to: "/users", label: "Users", icon: IconUsers, color: "#7c3aed", bg: "rgba(124,58,237,0.10)", module: "users" },
];

function Group({ title, links, onNavigate, badge, collapsed }: { title: string; links: typeof NAV_LINKS; onNavigate?: () => void; badge?: number; collapsed?: boolean }) {
  const pathname = usePathname();
  if (links.length === 0) return null;
  if (collapsed) {
    return (
      <div className="mt-3 flex flex-col items-center gap-1.5 px-3">
        {links.map((link) => {
          const active = pathname === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              href={link.to}
              onClick={onNavigate}
              title={link.label}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                active ? "font-extrabold" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
              )}
              style={active ? { color: link.color, background: link.bg } : undefined}
            >
              <Icon size={20} stroke={2} />
              {link.module === "quotations" && (badge ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white">
                  {(badge ?? 0) > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }
  return (
    <div className="mt-6 px-4 first:mt-2">
      <p className="px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <div className="mt-2 flex flex-col gap-1">
        {links.map((link) => {
          const active = pathname === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              href={link.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
                active ? "font-extrabold" : "font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
              )}
              style={active ? { color: link.color, background: link.bg } : undefined}
            >
              <Icon size={18} stroke={2} />
              <span className="flex-1">{link.label}</span>
              {link.module === "quotations" && (badge ?? 0) > 0 && (
                <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {(badge ?? 0) > 99 ? "99+" : badge}
                </span>
              )}
              {active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: link.color }} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarContent({ modules, onNavigate, pending = 0, collapsed = false, onToggle }: {
  modules: AppModule[];
  onNavigate?: () => void;
  pending?: number;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const visible = NAV_LINKS.filter((l) => modules.includes(l.module));
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className={collapsed ? "flex items-center justify-center px-2 pb-3 pt-6" : "flex items-center gap-3 px-5 pb-3 pt-6"} title="QMS">
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1976d2] to-[#42a5f5] shadow-[0_10px_22px_-12px_rgba(25,118,210,0.7)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="QMS" className="h-[26px] w-[26px] brightness-0 invert" />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block text-[17px] font-extrabold leading-tight text-slate-900 dark:text-white">QMS</span>
            <span className="block text-xs font-semibold text-slate-500">Quotation Manager</span>
          </span>
        )}
      </Link>
      <div className="flex-1 overflow-y-auto pb-4">
        <Group collapsed={collapsed} title="Dashboards" links={visible.filter((l) => l.module === "dashboard" || l.module === "quotations")} onNavigate={onNavigate} badge={pending} />
        <Group collapsed={collapsed} title="Management" links={visible.filter((l) => l.module === "forwarders" || l.module === "users")} onNavigate={onNavigate} />
      </div>
      {!collapsed ? (
        <div className="space-y-2 p-4 pt-0">
          <p className="rounded-full bg-slate-100 px-3 py-2 text-center text-[11px] font-semibold text-slate-400 dark:bg-white/5">
            QMS · Freight quotations
          </p>
          {onToggle && (
            <button onClick={onToggle} className="flex w-full items-center justify-center gap-2 rounded-full border border-[#e6ebf2] py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
              <IconChevronsLeft size={15} /> Collapse
            </button>
          )}
        </div>
      ) : (
        onToggle && (
          <div className="flex justify-center p-3">
            <button onClick={onToggle} title="Expand sidebar" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6ebf2] text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
              <IconChevronsRight size={16} />
            </button>
          </div>
        )
      )}
    </div>
  );
}
