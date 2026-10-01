"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { useAuth } from "@/components/auth-provider";
import { SidebarContent, SIDEBAR_WIDTH } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useQmsData } from "@/hooks/use-qms";
import { ADMIN_EMAIL, type AppModule } from "@/lib/domain";
import { QuotationDialog } from "@/components/quotations/quotation-dialog";
import type { Quotation } from "@/lib/domain";

const ALL_MODULES: AppModule[] = ["dashboard", "quotations", "forwarders", "users"];

export function AccessDenied() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[#e6ebf2] bg-white p-10 text-center dark:border-white/10 dark:bg-[#171d1b]">
      <p className="text-lg font-extrabold">Access restricted</p>
      <p className="mt-1 text-sm text-slate-500">Your account does not have access to this module.</p>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { session, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const store = useQmsData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("qms-sidebar");
    if (saved) return saved === "rail";
    return window.innerWidth < 1024;
  });

  const toggleSidebar = () => {
    setCollapsed((c) => {
      localStorage.setItem("qms-sidebar", c ? "full" : "rail");
      return !c;
    });
  };

  const handleMenu = () => {
    if (window.innerWidth >= 768) toggleSidebar();
    else setMobileOpen(true);
  };

  const currentAccess = useMemo(() => {
    if (user?.email === ADMIN_EMAIL) return { role: "Admin", modules: ALL_MODULES, active: true };
    const profile = store.appUsers.find((i) => i.email.toLowerCase() === (user?.email ?? "").toLowerCase());
    if (!profile) return { role: "Sales", modules: [] as AppModule[], active: false };
    return { role: profile.role, modules: profile.active ? profile.modules : [], active: profile.active };
  }, [store.appUsers, user]);

  const pending = useMemo(() => store.quotations.filter((q) => q.status === "Awaiting Approval").length, [store.quotations]);

  useEffect(() => {
    const open = () => { setEditing(null); setShowForm(true); };
    window.addEventListener("qms:new-quotation", open);
    return () => window.removeEventListener("qms:new-quotation", open);
  }, []);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }
  if (!session) {
    if (pathname !== "/login") router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#e9edf3] dark:bg-[#0f1412]">
      {/* desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#e6ebf2] bg-white transition-[width] md:block dark:border-white/10 dark:bg-[#171d1b] ${collapsed ? "w-[76px]" : "w-[272px]"}`}>
        <SidebarContent
          modules={currentAccess.modules}
          pending={pending}
          collapsed={collapsed}
          onToggle={toggleSidebar}
        />
      </aside>
      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] bg-white dark:bg-[#171d1b]">
            <SidebarContent
              modules={currentAccess.modules}
              pending={pending}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className={collapsed ? "md:pl-[76px]" : "md:pl-[272px]"}>
        <Topbar onMenu={handleMenu} pending={pending} role={currentAccess.role} />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
          {store.loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading quotations…</div>
          ) : (
            children
          )}
        </main>
        {/* mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6ebf2] bg-white/95 backdrop-blur md:hidden dark:border-white/10 dark:bg-[#171d1b]/95">
          <div className="flex h-[68px] items-center justify-around px-2">
            <Link href="/" className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500">Dashboard</Link>
            <Link href="/quotations" className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500">Quotations</Link>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              aria-label="Add quotation"
              className="flex h-[52px] w-[52px] -translate-y-4 items-center justify-center rounded-2xl bg-[#1976d2] text-white shadow-[0_12px_24px_-12px_rgba(25,118,210,0.7)]"
            >
              <IconPlus size={22} />
            </button>
            <Link href="/forwarders" className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500">Forwarders</Link>
            <Link href="/users" className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500">Users</Link>
          </div>
        </nav>
      </div>

      {showForm && (
        <QuotationDialog
          quotation={editing}
          forwarders={store.forwarders}
          userEmail={user?.email ?? ""}
          quotations={store.quotations}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

export function useAccess() {
  return { ALL_MODULES, SIDEBAR_WIDTH };
}
