"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconFileDescription, IconCash, IconTruck, IconChartPie, IconWallet, IconTrophy, IconMapPin } from "@tabler/icons-react";
import { useQmsData } from "@/hooks/use-qms";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_EMAIL, ENTITIES, CURRENCY_LIST, calculateAwardSavings, convertCurrency } from "@/lib/domain";
import { getEntityColor } from "@/lib/entityColors";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/fields";
import { FreightTrend } from "@/components/dashboard/freight-trend";

const FWD_COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#d946ef", "#f43f5e", "#8b5cf6"];

const RANK_STYLE = ["bg-amber-400 text-white", "bg-slate-300 text-slate-700", "bg-amber-700/80 text-white"];

const STATS = [
  { key: "pos", label: "Total POs", tint: "rgba(99,102,241,0.12)", accent: "#4f46e5", Icon: IconFileDescription },
  { key: "povalue", label: "Total PO Value", tint: "rgba(2,132,199,0.12)", accent: "#0284c7", Icon: IconCash },
  { key: "freight", label: "Freight Spending", tint: "rgba(217,119,6,0.14)", accent: "#d97706", Icon: IconTruck },
  { key: "pct", label: "Freight vs PO", tint: "rgba(147,51,234,0.12)", accent: "#9333ea", Icon: IconChartPie },
  { key: "savings", label: "Total Savings", tint: "rgba(5,150,105,0.12)", accent: "#059669", Icon: IconWallet },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { quotations, forwarders, loading } = useQmsData();
  const [currency, setCurrency] = useState("AED");
  const [month, setMonth] = useState("");
  const isAdmin = user?.email === ADMIN_EMAIL;

  const active = useMemo(() => quotations.filter((q) => q.status !== "Awaiting Approval" && q.status !== "Rejected"), [quotations]);
  const months = useMemo(() => {
    const s = new Set<string>();
    active.forEach((q) => { if (q.createdAt) { const d = new Date(q.createdAt); if (!isNaN(d.getTime())) s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); } });
    return [...s].sort().reverse();
  }, [active]);
  const filtered = useMemo(() => {
    let list = active.filter((q) => !q.excludedFromPO);
    if (month) list = list.filter((q) => q.createdAt?.startsWith(month));
    return list;
  }, [active, month]);

  const totals = useMemo(() => {
    const po = filtered.reduce((s, q) => s + convertCurrency(q.poValue, q.poValueCurrency || "AED", currency), 0);
    const freight = filtered.reduce((s, q) => {
      if (!q.awardedTo) return s;
      const quote = q.quotes.find((x) => x.forwarder === q.awardedTo);
      return quote ? s + convertCurrency(quote.quotedAmount, quote.currency || "AED", currency) : s;
    }, 0);
    const savings = filtered.reduce((s, q) => {
      const v = calculateAwardSavings(q.quotes, q.poValueCurrency || "AED", q.awardedTo) ?? q.savings ?? 0;
      return s + convertCurrency(v, q.poValueCurrency || "AED", currency);
    }, 0);
    return { po, freight, savings, pct: po > 0 ? ((freight / po) * 100).toFixed(1) : "0.0", count: filtered.length };
  }, [filtered, currency]);

  const forwarderStats = useMemo(() => forwarders.map((f) => {
    const awarded = filtered.filter((q) => q.awardedTo === f.name);
    const value = awarded.reduce((s, q) => {
      const quote = q.quotes.find((x) => x.forwarder === f.name);
      return quote ? s + convertCurrency(quote.quotedAmount, quote.currency || "AED", currency) : s;
    }, 0);
    return { name: f.name, count: awarded.length, value };
  }), [forwarders, filtered, currency]);
  const totalFwd = forwarderStats.reduce((s, f) => s + f.value, 0);

  const entityStats = useMemo(() => ENTITIES.map((e) => {
    const items = filtered.filter((q) => q.entity === e);
    const po = items.reduce((s, q) => s + convertCurrency(q.poValue, q.poValueCurrency || "AED", currency), 0);
    const fr = items.reduce((s, q) => {
      const quote = q.quotes.find((x) => x.forwarder === q.awardedTo);
      return q.awardedTo && quote ? s + convertCurrency(quote.quotedAmount, quote.currency || "AED", currency) : s;
    }, 0);
    return { entity: e, count: items.length, po, fr, pct: po > 0 ? ((fr / po) * 100).toFixed(1) : "0.0" };
  }), [filtered, currency]);

  const pending = quotations.filter((q) => q.status === "Awaiting Approval").length;
  const values: Record<string, string> = {
    pos: String(totals.count),
    povalue: `${totals.po.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    freight: `${totals.freight.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    pct: `${totals.pct}%`,
    savings: `${totals.savings.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  };

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Loading dashboard…</p>;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-end gap-3 !p-4">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="!w-[110px]">
            {CURRENCY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-[170px]">
            <option value="">All months</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          {month && <button onClick={() => setMonth("")} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold">Clear</button>}
          {isAdmin && pending > 0 && (
            <Link href="/quotations" className="rounded-full bg-amber-100 px-4 py-2 text-xs font-extrabold text-amber-800">
              {pending} pending approval{pending !== 1 ? "s" : ""}
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {STATS.map((s) => (
          <Card key={s.key} className="relative overflow-hidden">
            <span className="absolute -right-7 -top-7 h-24 w-24 rounded-full" style={{ background: s.tint }} />
            <CardContent>
              <span className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-xl" style={{ background: s.tint, color: s.accent }}>
                <s.Icon size={22} />
              </span>
              <p className="text-xl font-extrabold tracking-tight">{values[s.key]}</p>
              <p className="text-sm font-bold text-slate-500">{s.label}</p>
              <p className="text-xs text-slate-400">{s.key === "povalue" || s.key === "freight" || s.key === "savings" ? currency : s.key === "pos" ? `${ENTITIES.length} entities` : "of PO value"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="xl:col-span-5">
          <FreightTrend quotations={active} currency={currency} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardContent>
            <div className="mb-1 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                <IconTrophy size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="font-extrabold">Forwarder Performance</p>
                <p className="text-xs text-slate-500">Awarded freight value by forwarder</p>
              </span>
              {forwarderStats.filter((f) => f.count > 0).length > 0 && (
                <span className="flex items-center">
                  {forwarderStats.filter((f) => f.count > 0).slice(0, 4).map((f, i) => (
                    <span
                      key={f.name}
                      title={f.name}
                      className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-extrabold text-white first:ml-0 dark:border-[#171d1b]"
                      style={{ background: FWD_COLORS[i % FWD_COLORS.length] }}
                    >
                      {f.name.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  <span className="-ml-2 flex h-8 items-center rounded-full border-2 border-white bg-slate-100 px-2 text-[11px] font-extrabold text-slate-600 first:ml-0 dark:border-[#171d1b]">
                    {forwarderStats.filter((f) => f.count > 0).length}
                  </span>
                </span>
              )}
            </div>
            <div className="mb-2 flex items-end justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
              <span>
                <span className="block text-2xl font-extrabold tracking-tight">{totalFwd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-xs text-slate-500">Total awarded · {currency}</span>
              </span>
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                {forwarderStats.reduce((s, f) => s + f.count, 0)} awards
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {forwarderStats.map((f, i) => {
                const pct = totalFwd > 0 ? Math.round((f.value / totalFwd) * 100) : 0;
                const color = FWD_COLORS[i % FWD_COLORS.length]!;
                const rank = [...forwarderStats].sort((a, b) => b.value - a.value).findIndex((x) => x.name === f.name) + 1;
                const avg = f.count > 0 ? f.value / f.count : 0;
                return (
                  <div key={f.name} className="py-3">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold" style={{ background: `${color}1a`, color }}>
                        {f.name.charAt(0).toUpperCase()}
                        {rank <= 3 && f.value > 0 && (
                          <span className={`absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-extrabold ${RANK_STYLE[rank - 1]}`}>
                            {rank}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{f.name}</span>
                        <span className="block text-xs text-slate-400">
                          {f.count} award{f.count !== 1 ? "s" : ""} · {pct}% share{f.count > 0 ? ` · avg ${avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ""}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="tabular block font-mono text-sm font-bold">{f.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="block text-[11px] text-slate-400">{currency}</span>
                      </span>
                      <span className="rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ background: `${color}1a`, color }}>{pct}%</span>
                    </div>
                    <div className="ml-12 h-[5px] overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
              {forwarderStats.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No data yet</p>}
            </div>
            <Link href="/quotations" className="mt-2 block rounded-full bg-slate-100 py-2 text-center text-xs font-extrabold text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300">
              View all quotations →
            </Link>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardContent>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
                <IconMapPin size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="font-extrabold">Entity Breakdown</p>
                <p className="text-xs text-slate-500">PO value, freight and freight ratio</p>
              </span>
              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-extrabold text-violet-600">
                {entityStats.reduce((s, e) => s + e.count, 0)} POs
              </span>
            </div>
            <div className="mb-3 flex items-center justify-between rounded-full bg-violet-500/[0.07] px-4 py-2.5 text-sm dark:bg-violet-500/10">
              <span className="text-xs font-bold text-slate-500">Combined · {currency}</span>
              <span className="tabular font-mono text-sm font-extrabold">
                {entityStats.reduce((s, e) => s + e.po, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} PO ·{" "}
                {entityStats.reduce((s, e) => s + e.fr, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} freight
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {entityStats.map((e) => {
                const ec = getEntityColor(e.entity);
                const totalPo = entityStats.reduce((s, x) => s + x.po, 0);
                const share = totalPo > 0 ? Math.round((e.po / totalPo) * 100) : 0;
                return (
                  <div key={e.entity} className="flex gap-3 py-3.5">
                    <span className="w-2 shrink-0 self-stretch rounded-full" style={{ background: ec.gradient }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-extrabold tracking-wide">{e.entity}</p>
                        <p className="font-extrabold" style={{ color: ec.main }}>{e.pct}%</p>
                      </div>
                      <p className="mb-2 text-xs text-slate-400">{e.count} quotation{e.count !== 1 ? "s" : ""} · {share}% of PO · freight ratio</p>
                      <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                        <span className="rounded-full bg-slate-50 px-3.5 py-1.5 dark:bg-white/5">
                          <span className="block text-[10px] font-bold uppercase text-slate-400">PO Value</span>
                          <span className="tabular font-mono font-bold">{e.po.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </span>
                        <span className="rounded-full bg-slate-50 px-3.5 py-1.5 dark:bg-white/5">
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Freight</span>
                          <span className="tabular font-mono font-bold">{e.fr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </span>
                      </div>
                      <div className="h-[6px] overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(parseFloat(e.pct), 100)}%`, background: ec.gradient }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
