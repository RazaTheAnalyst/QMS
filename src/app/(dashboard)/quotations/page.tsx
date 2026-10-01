"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import * as XLSX from "xlsx";
import { IconDownload, IconStar, IconStarFilled, IconPencil, IconTrash, IconCopy, IconPlus, IconShip, IconPlane, IconTruck, IconPackage, IconArrowRight } from "@tabler/icons-react";
import { getEntityColor } from "@/lib/entityColors";
import { STATUS_COLORS, STATUS_DEFAULT } from "@/lib/statusColors";
import { useQmsData } from "@/hooks/use-qms";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_EMAIL, STATUS_LIST, ENTITIES, calculateAwardSavings, convertCurrency, type Quotation } from "@/lib/domain";
import { updateQuotationAPI, deleteQuotationAPI } from "@/lib/api";
import { MODES_LIST } from "@/lib/locations";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { QuotationDialog } from "@/components/quotations/quotation-dialog";

const TABS = ["Active", "Awaiting Approval", "Rejected", "Delivered"] as const;

function modeMeta(mode: string) {
  if (mode.includes("SEA")) return { color: "#0284c7", Icon: IconShip };
  if (mode === "Air") return { color: "#0ea5e9", Icon: IconPlane };
  if (mode === "Road") return { color: "#b7791f", Icon: IconTruck };
  return { color: "#7c3aed", Icon: IconPackage };
}

function statusMeta(status: string) {
  return STATUS_COLORS[status] ?? STATUS_DEFAULT;
}

function etaInfo(eta: string) {
  if (!eta) return null;
  const d = new Date(`${eta}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  return {
    label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    diff,
  };
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function stamp(date?: string) {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function lowestOf(q: { quotes: Array<{ forwarder: string; quotedAmount: number; currency?: string }>; poValueCurrency?: string }) {
  const v = q.quotes.filter((x) => x.quotedAmount > 0);
  if (v.length === 0) return 0;
  return Math.min(...v.map((x) => convertCurrency(x.quotedAmount, x.currency || "AED", q.poValueCurrency || "AED")));
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-sm text-slate-500">Loading quotations…</p>}>
      <QuotationsView />
    </Suspense>
  );
}

function QuotationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { quotations, forwarders, loading } = useQmsData();
  const { mutate } = useSWRConfig();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Active");
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [detail, setDetail] = useState<Quotation | null>(null);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 25;

  // Header search (?q=) feeds the table filter (render-time sync, no effect)
  const urlQuery = searchParams.get("q") ?? "";
  const [lastQuery, setLastQuery] = useState(urlQuery);
  if (lastQuery !== urlQuery) {
    setLastQuery(urlQuery);
    setSearch(urlQuery);
    setPage(0);
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quotations.filter((q) => {
      const matchSearch = !s || [q.supplierName, q.supplierPO, q.remarks, q.origin, q.destination, q.awardedTo, q.entity, q.mode, q.status].join(" ").toLowerCase().includes(s) || q.quotes.some((x) => x.forwarder.toLowerCase().includes(s));
      const matchTab = s ? true : tab === "Active" ? !["Awaiting Approval", "Rejected", "Delivered"].includes(q.status) : q.status === tab;
      return matchSearch && matchTab && (!entity || q.entity === entity) && (!status || q.status === status) && (!mode || q.mode === mode);
    });
  }, [quotations, search, tab, entity, status, mode]);

  const pageRows = filtered.slice(page * perPage, page * perPage + perPage);
  const live = detail ? quotations.find((q) => q.id === detail.id) ?? detail : null;

  const award = async (id: number, forwarder: string) => {
    const q = quotations.find((x) => x.id === id);
    let patch: Record<string, unknown> = { awardedTo: forwarder };
    if (q && q.quotes.length >= 2) {
      const s = calculateAwardSavings(q.quotes, q.poValueCurrency || "AED", forwarder);
      if (s !== null) patch = { ...patch, savings: s };
    }
    await updateQuotationAPI(id, patch);
    mutate("quotations");
  };

  const changeStatus = async (id: number, st: string) => {
    if (st === "Assign to forwarder") {
      const q = quotations.find((x) => x.id === id);
      if (q && !q.awardedTo) { alert("Award a quote before approving."); return; }
      const base = (user?.email ?? "").split("@")[0];
      await updateQuotationAPI(id, { status: st, approvedBy: base, approvedAt: new Date().toISOString() });
    } else if (st === "Rejected") {
      const reason = prompt("Rejection reason:") ?? "";
      await updateQuotationAPI(id, { status: "Rejected", remarks: `Rejected: ${reason.trim() || "No reason provided."}` });
    } else {
      await updateQuotationAPI(id, { status: st });
    }
    mutate("quotations");
    setDetail(null);
  };

  const exportExcel = async () => {
    const data = filtered.map((q) => ({
      Entity: q.entity, Supplier: q.supplierName, "PO Number": q.supplierPO, "PO Value": q.poValue,
      Origin: q.origin, Destination: q.destination, Mode: q.mode, Status: q.status,
      "Awarded To": q.awardedTo || "-", Savings: calculateAwardSavings(q.quotes, q.poValueCurrency || "AED", q.awardedTo) ?? q.savings,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotations");
    XLSX.writeFile(wb, `Quotations_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Loading quotations…</p>;

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_232px]">
      <Card className="!rounded-3xl lg:sticky lg:top-[84px] lg:order-2">
        <CardContent className="flex flex-row flex-wrap items-center gap-2 !p-3 sm:!p-4 lg:flex-col lg:items-stretch lg:gap-0">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search supplier, PO, forwarder, mode, origin…" className="min-w-[200px] flex-1 md:hidden" />
          <p className="hidden text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 lg:mb-2 lg:block">Status</p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-slate-100 p-1 lg:flex-col lg:items-stretch lg:rounded-2xl lg:bg-transparent lg:p-0 dark:bg-white/5 lg:dark:bg-transparent">
            {TABS.map((t) => {
              const count = t === "Active" ? quotations.filter((q) => !["Awaiting Approval", "Rejected", "Delivered"].includes(q.status)).length : quotations.filter((q) => q.status === t).length;
              const selected = tab === t;
              return (
                <button key={t} onClick={() => { setTab(t); setPage(0); }} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition-all lg:justify-between lg:px-3.5 ${selected ? "bg-white text-[#1976d2] shadow-[0_4px_12px_-6px_rgba(16,24,40,0.4)] lg:border lg:border-[#1976d2]/30 lg:bg-[#1976d2]/10 dark:bg-[#1976d2] dark:text-white lg:dark:border-transparent" : "text-slate-500 hover:text-slate-800 lg:border lg:border-transparent lg:hover:border-[#e6ebf2] dark:text-slate-400 dark:hover:text-slate-200"}`}>
                  {t} <span className={`rounded-full px-1.5 py-px text-[10px] ${selected ? "bg-[#1976d2] text-white dark:bg-white/25" : "bg-white text-slate-400 dark:bg-white/10 dark:text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <p className="hidden text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 lg:mb-2 lg:mt-4 lg:block">Filters</p>
          <div className="flex min-w-[200px] flex-1 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
            <Select value={entity || "all"} onChange={(e) => setEntity(e.target.value === "all" ? "" : e.target.value)} className="flex-1 lg:!w-full">
              <option value="all">All Entities</option>{ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
            <Select value={status || "all"} onChange={(e) => setStatus(e.target.value === "all" ? "" : e.target.value)} className="flex-1 lg:!w-full">
              <option value="all">All Status</option>{STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={mode || "all"} onChange={(e) => setMode(e.target.value === "all" ? "" : e.target.value)} className="flex-1 lg:!w-full">
              <option value="all">All Modes</option>{MODES_LIST.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          <div className="flex w-full items-center gap-2 lg:mt-3 lg:flex-col lg:items-stretch lg:gap-2 lg:border-t lg:border-dashed lg:border-[#e6ebf2] lg:pt-3 dark:lg:border-white/10">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">{filtered.length} of {quotations.length}</span>
              {(entity || status || mode || search) && (
                <button onClick={() => { setEntity(""); setStatus(""); setMode(""); setSearch(""); setPage(0); router.push("/quotations"); }} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold text-[#c2412d] hover:bg-red-50 dark:hover:bg-red-500/10">
                  Reset ✕
                </button>
              )}
            </div>
            <div className="ml-auto flex gap-2 lg:ml-0 lg:grid lg:grid-cols-1 lg:gap-2">
              <Button variant="secondary" size="sm" onClick={exportExcel} className="lg:w-full"><IconDownload size={15} /> Export Excel</Button>
              <Button size="sm" onClick={() => window.dispatchEvent(new Event("qms:new-quotation"))} className="lg:w-full"><IconPlus size={15} /> New Quotation</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden !rounded-[14px] border-t-4 !border-t-[#1976d2] p-0 lg:order-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="bg-[#eef4fb] text-left text-[11px] uppercase tracking-[0.08em] text-[#1976d2]/80 dark:bg-white/5 dark:text-slate-400">
                {["Entity", "Supplier", "PO", "PO Value", "Route", "Mode", "Status", "ETA", "Freight %", "Savings"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-3 font-extrabold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {pageRows.map((q) => {
                const savings = calculateAwardSavings(q.quotes, q.poValueCurrency || "AED", q.awardedTo) ?? q.savings;
                const ec = getEntityColor(q.entity);
                const st = statusMeta(q.status);
                const mm = modeMeta(q.mode);
                const eta = etaInfo(q.eta);
                const quoteCount = q.quotes.filter((x) => x.quotedAmount > 0).length;
                const pctTone = q.percentage >= 30 ? "#c2412d" : q.percentage >= 20 ? "#d89b28" : "#1976d2";
                return (
                  <tr key={q.id} className="cursor-pointer transition-colors hover:bg-[#1976d2]/[0.05] dark:hover:bg-white/[0.04]" onClick={() => setDetail(q)}>
                    <td className="px-3 py-3">
                      <span className="rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ color: ec.main, background: `${ec.main}1a` }}>{q.entity}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[150px] font-bold text-slate-800 dark:text-white">{q.supplierName}</p>
                      <p className="max-w-[150px] truncate text-[11px] font-semibold text-slate-400" title={q.awardedTo || `${quoteCount} quotes`}>
                        {q.awardedTo
                          ? <span className="text-emerald-600 dark:text-emerald-400">★ {q.awardedTo}</span>
                          : `${quoteCount} quote${quoteCount !== 1 ? "s" : ""}`}
                      </p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-500">{q.supplierPO}</td>
                    <td className="px-3 py-3 text-right">
                      <p className="tabular font-mono text-sm font-extrabold text-slate-800 dark:text-white">{q.poValue.toLocaleString()}</p>
                      <p className="mt-0.5 inline-block rounded-full bg-[#1976d2]/10 px-1.5 text-[10px] font-extrabold text-[#1976d2] dark:text-[#90caf9]">{q.poValueCurrency || "AED"}</p>
                    </td>
                    <td className="px-3 py-3">
                        <p className="flex max-w-[170px] items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="truncate">{q.origin}</span>
                        <IconArrowRight size={13} className="shrink-0 text-[#1976d2]" />
                        <span className="truncate">{q.destination}</span>
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ color: mm.color, background: `${mm.color}1a` }}>
                        <mm.Icon size={13} /> {q.mode}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      {q.status === "Awaiting Approval" && isAdmin ? (
                        <span className="flex gap-1.5">
                          <button onClick={() => changeStatus(q.id, "Assign to forwarder")} className="rounded-full bg-gradient-to-b from-[#1fa06d] to-[#168256] px-3 py-1.5 text-xs font-bold text-white shadow">Approve</button>
                          <button onClick={() => changeStatus(q.id, "Rejected")} className="rounded-full bg-gradient-to-b from-[#d9533f] to-[#c2412d] px-3 py-1.5 text-xs font-bold text-white shadow">Reject</button>
                        </span>
                      ) : (
                        <span className="inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-extrabold" style={{ color: st.color, background: `${st.color}1a`, borderColor: `${st.color}33` }}>{q.status}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {eta ? (
                        <span>
                          <p className="whitespace-nowrap font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{eta.label}</p>
                          <p className={`text-[10px] font-extrabold ${eta.diff < 0 && q.status !== "Delivered" ? "text-red-500" : eta.diff === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                            {eta.diff === 0 ? "● Today" : eta.diff > 0 ? `in ${eta.diff}d` : `${Math.abs(eta.diff)}d overdue`}
                          </p>
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="tabular font-mono text-sm font-extrabold" style={{ color: pctTone }}>{q.percentage}%</p>
                      <span className="mt-1 block h-1 w-8 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (q.percentage / 40) * 100)}%`, background: pctTone }} />
                      </span>
                    </td>
                    <td className={`px-3 py-3 text-right font-mono text-sm font-extrabold ${savings < 0 ? "text-red-600" : savings > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600"}`}>
                      {savings !== 0 ? <><p className="tabular">{Math.abs(savings).toLocaleString()}</p><p className="text-[10px] font-bold opacity-80">{q.poValueCurrency}</p></> : "-"}
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && <tr><td colSpan={10} className="px-4 py-14 text-center text-slate-400">No quotations found. Try adjusting filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#e6ebf2] bg-[#f8fafc] px-3 py-3 text-sm dark:border-white/10 dark:bg-white/[0.02]">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:bg-white/5 dark:text-slate-400">{filtered.length} rows</span>
          <span className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-full border border-[#e6ebf2] bg-white px-4 py-1.5 text-xs font-bold shadow-sm disabled:opacity-40 dark:border-white/10 dark:bg-white/5">Prev</button>
            <button disabled={(page + 1) * perPage >= filtered.length} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-[#e6ebf2] bg-white px-4 py-1.5 text-xs font-bold shadow-sm disabled:opacity-40 dark:border-white/10 dark:bg-white/5">Next</button>
          </span>
        </div>
      </Card>
      </div>

      {live && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={() => setDetail(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-[#171d1b]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 overflow-hidden rounded-2xl border border-[#e6ebf2] dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2 bg-[#eef4fb] px-4 py-3 dark:bg-white/5">
                <span className="rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ color: getEntityColor(live.entity).main, background: `${getEntityColor(live.entity).main}1a` }}>{live.entity}</span>
                <b className="text-slate-800 dark:text-white">{live.supplierName}</b>
                <span className="font-mono text-xs text-slate-500">{live.supplierPO}</span>
                {live.awardedTo && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">★ {live.awardedTo}</span>}
                <span className="ml-auto inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-extrabold" style={{ color: statusMeta(live.status).color, background: `${statusMeta(live.status).color}1a`, borderColor: `${statusMeta(live.status).color}33` }}>{live.status}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[
                  { label: "PO Value", value: `${live.poValueCurrency} ${live.poValue.toLocaleString()}`, cls: "bg-blue-500/[0.07] text-[#1565c0] dark:text-[#90caf9]" },
                  { label: "Lowest Quote", value: lowestOf(live) > 0 ? `${live.poValueCurrency} ${lowestOf(live).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—", cls: "bg-indigo-500/[0.07] text-indigo-600 dark:text-indigo-300" },
                  { label: "Freight %", value: `${live.percentage}%`, cls: "bg-amber-500/[0.08] text-amber-700 dark:text-amber-300" },
                  { label: (calculateAwardSavings(live.quotes, live.poValueCurrency || "AED", live.awardedTo) ?? live.savings ?? 0) >= 0 ? "Savings" : "Extra Cost", value: `${live.poValueCurrency} ${Math.abs(calculateAwardSavings(live.quotes, live.poValueCurrency || "AED", live.awardedTo) ?? live.savings ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, cls: (calculateAwardSavings(live.quotes, live.poValueCurrency || "AED", live.awardedTo) ?? live.savings ?? 0) >= 0 ? "bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300" : "bg-red-500/[0.08] text-red-600 dark:text-red-300" },
                ].map((k) => (
                  <div key={k.label} className={`px-4 py-3 ${k.cls}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] opacity-80">{k.label}</p>
                    <p className="tabular font-mono text-[15px] font-extrabold">{k.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4 rounded-2xl border border-[#e6ebf2] bg-[#f8fafc] p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Shipment</p>
              <p className="mb-3 flex flex-wrap items-center gap-1.5 text-[15px] font-extrabold text-slate-800 dark:text-white">
                {live.origin || "—"} <IconArrowRight size={16} className="text-[#1976d2]" /> {live.destination || "—"}
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {[live.mode, live.size, live.incoterms, live.transitTime].filter(Boolean).map((chip) => (
                  <span key={chip} className="rounded-full border border-[#e6ebf2] bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{chip}</span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "ETD", value: fmtDate(live.etd) },
                  { label: "ETA", value: fmtDate(live.eta) },
                  { label: "ETA Status", value: (() => { const e = etaInfo(live.eta); if (!e) return "—"; if (e.diff === 0) return "Today"; return e.diff > 0 ? `in ${e.diff}d` : `${Math.abs(e.diff)}d overdue`; })() },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl bg-white px-2 py-2 dark:bg-white/5">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">{x.label}</p>
                    <p className="font-mono text-[13px] font-extrabold">{x.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="mb-2 text-sm font-extrabold">Forwarder Quotes</p>
            <div className="mb-4 space-y-2">
              {(() => {
                const valid = live.quotes.filter((x) => x.quotedAmount > 0);
                const conv = valid.map((x) => convertCurrency(x.quotedAmount, x.currency || "AED", live.poValueCurrency || "AED"));
                const lo = conv.length ? Math.min(...conv) : 0;
                const hi = conv.length ? Math.max(...conv) : 0;
                const ranged = conv.length > 1 && lo !== hi;
                return valid.map((qt) => {
                  const amount = convertCurrency(qt.quotedAmount, qt.currency || "AED", live.poValueCurrency || "AED");
                  const isLow = ranged && amount === lo;
                  const isHigh = ranged && amount === hi;
                  return (
                <div key={qt.forwarder} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 ${live.awardedTo === qt.forwarder ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10" : isLow ? "border-emerald-400/60 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/5" : isHigh ? "border-red-300/60 bg-red-50/40 dark:border-red-500/30 dark:bg-red-500/5" : "border-[#e6ebf2] bg-white dark:border-white/10 dark:bg-transparent"}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <b className="truncate text-sm text-slate-800 dark:text-white">{qt.forwarder}</b>
                    {isLow && <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">Lowest</span>}
                    {isHigh && <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">Highest</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">{convertCurrency(qt.quotedAmount, qt.currency || "AED", "AED").toLocaleString()} AED <span className="text-xs font-normal text-slate-400">{qt.currency} {qt.quotedAmount.toLocaleString()}</span></span>
                    <button onClick={() => award(live.id, qt.forwarder)} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${live.awardedTo === qt.forwarder ? "bg-emerald-600 text-white" : "border border-[#e6ebf2] text-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-white/15 dark:text-slate-300"}`}>
                      {live.awardedTo === qt.forwarder ? <IconStarFilled size={13} /> : <IconStar size={13} />} {live.awardedTo === qt.forwarder ? "Awarded" : "Award"}
                    </button>
                  </span>
                </div>
                  );
                });
              })()}
              {live.quotes.filter((x) => x.quotedAmount > 0).length === 0 && <p className="py-3 text-center text-sm text-slate-400">No quotes yet</p>}
            </div>
            {live.remarks && <p className="mb-4 rounded-2xl border border-[#e6ebf2] bg-[#f8fafc] p-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300">{live.remarks}</p>}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-white/5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Created by</p>
                <p className="text-[13px] font-bold">{live.createdBy || "—"} <span className="font-mono font-semibold text-slate-400">{stamp(live.createdAt)}</span></p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-white/5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Approved by</p>
                <p className="text-[13px] font-bold">{live.approvedBy || "—"} <span className="font-mono font-semibold text-slate-400">{stamp(live.approvedAt)}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e6ebf2] pt-4 dark:border-white/10">
              {live.status === "Awaiting Approval" && isAdmin && (
                <>
                  <Button size="sm" variant="success" onClick={() => changeStatus(live.id, "Assign to forwarder")} disabled={!live.awardedTo}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => changeStatus(live.id, "Rejected")}>Reject</Button>
                </>
              )}
              {(live.status === "Pending" || live.status === "Sent for quotation") && live.quotes.some((x) => x.quotedAmount > 0) && (
                <Button size="sm" variant="warning" onClick={() => changeStatus(live.id, "Awaiting Approval")}>Submit for Approval</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setDetail(null)}>Close</Button>
              <Button size="sm" variant="violet" onClick={() => { setDetail(null); setEditing({ ...live, id: 0, status: "Pending", awardedTo: "", savings: 0 }); setShowForm(true); }}><IconCopy size={14} /> Clone</Button>
              <Button size="sm" variant="default" onClick={() => { setDetail(null); setEditing(live); setShowForm(true); }}><IconPencil size={14} /> Edit</Button>
              {isAdmin && <Button size="sm" variant="destructive" onClick={async () => { if (confirm("Delete this quotation?")) { await deleteQuotationAPI(live.id); mutate("quotations"); setDetail(null); } }}><IconTrash size={14} /> Delete</Button>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <QuotationDialog quotation={editing} forwarders={forwarders} userEmail={user?.email ?? ""} quotations={quotations} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}
