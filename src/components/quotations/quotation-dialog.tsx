"use client";

import type * as React from "react";
import { useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSWRConfig } from "swr";
import { ENTITIES, STATUS_LIST, CURRENCY_LIST, calculateAwardSavings, convertCurrency, type Quotation, type Forwarder } from "@/lib/domain";
import { createQuotation, updateQuotationAPI } from "@/lib/api";
import { MODES_LIST, INCOTERMS_LIST } from "@/lib/locations";
import { LocationCombobox } from "@/components/quotations/location-combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/fields";
import {
  IconX, IconPlus, IconBuilding, IconHash, IconCash, IconTruck,
  IconCalendar, IconNote, IconTrophy, IconStar, IconStarFilled, IconCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  entity: z.string().min(1),
  supplierName: z.string().min(2),
  supplierPO: z.string().min(3),
  poValue: z.coerce.number().min(1),
  poValueCurrency: z.string().default("AED"),
  origin: z.string().min(1),
  destination: z.string().min(1),
  mode: z.string().min(1),
  incoterms: z.string().min(1),
  size: z.string().min(1),
  transitTime: z.string().optional().default(""),
  etd: z.string().optional().default(""),
  eta: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  status: z.string().default("Pending"),
  awardedTo: z.string().optional().default(""),
  savings: z.coerce.number().optional().default(0),
  quotes: z.array(z.object({
    forwarder: z.string().min(1),
    quotedAmount: z.coerce.number().min(0).default(0),
    currency: z.string().default("AED"),
  })).default([]),
});

type FormData = z.infer<typeof schema>;

type AccentKey = "blue" | "amber" | "violet" | "emerald";

const ACCENTS: Record<AccentKey, {
  strip: string;
  medallion: string;
  body: string;
  chip: string;
}> = {
  blue: {
    strip: "bg-gradient-to-r from-[#1565c0] via-[#1976d2] to-[#42a5f5]",
    medallion: "bg-[#1976d2]/12 text-[#1976d2] dark:bg-[#42a5f5]/15 dark:text-[#90caf9]",
    body: "bg-[#f3f8fe] dark:bg-white/[0.02]",
    chip: "bg-[#1976d2]/10 text-[#1565c0] dark:text-[#90caf9]",
  },
  amber: {
    strip: "bg-gradient-to-r from-[#945f18] via-[#d89b28] to-[#f2c94c]",
    medallion: "bg-[#d89b28]/15 text-[#b7791f] dark:bg-[#d89b28]/15 dark:text-[#f2c94c]",
    body: "bg-[#fdf8ec] dark:bg-white/[0.02]",
    chip: "bg-[#d89b28]/15 text-[#945f18] dark:text-[#f2c94c]",
  },
  violet: {
    strip: "bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#a78bfa]",
    medallion: "bg-[#7c3aed]/12 text-[#7c3aed] dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]",
    body: "bg-[#f6f2fe] dark:bg-white/[0.02]",
    chip: "bg-[#7c3aed]/10 text-[#6d28d9] dark:text-[#c4b5fd]",
  },
  emerald: {
    strip: "bg-gradient-to-r from-[#0d6b45] via-[#168256] to-[#34d399]",
    medallion: "bg-[#168256]/12 text-[#168256] dark:bg-[#34d399]/15 dark:text-[#6ee7b7]",
    body: "bg-[#ecfdf5] dark:bg-white/[0.02]",
    chip: "bg-[#168256]/10 text-[#0d6b45] dark:text-[#6ee7b7]",
  },
};

function Field({ label, icon: Icon, error, hint, children }: {
  label: string;
  icon?: typeof IconCash;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group min-w-0">
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#1976d2]" />}
        <div className={Icon ? "[&>input]:pl-10 [&>select]:pl-10 [&>textarea]:pl-10" : ""}>{children}</div>
      </div>
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function Section({ step, accent, title, hint, stat, action, children, wide }: {
  step: string;
  accent: AccentKey;
  title: string;
  hint: string;
  stat?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <section className="overflow-hidden rounded-3xl border border-[#e6ebf2] bg-white shadow-[0_20px_45px_-28px_rgba(16,24,40,0.4)] dark:border-white/10 dark:bg-[#171d1b] dark:shadow-[0_20px_45px_-28px_rgba(0,0,0,0.8)]">
      <span className={cn("block h-1.5", a.strip)} />
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold shadow-sm", a.medallion)}>
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold tracking-tight">{title}</span>
          <span className="block truncate text-xs text-slate-400">{hint}</span>
        </span>
        {stat}
        {action}
      </div>
      <div className={cn("grid gap-4 border-t border-[#e6ebf2]/70 p-4 sm:p-5", wide ? "sm:grid-cols-2" : "sm:grid-cols-3", a.body, "dark:border-white/5")}>{children}</div>
    </section>
  );
}

const RANK_MEDAL = [
  "bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-[0_4px_10px_-4px_rgba(245,158,11,0.8)]",
  "bg-gradient-to-b from-slate-200 to-slate-400 text-slate-700",
  "bg-gradient-to-b from-amber-600 to-amber-800 text-white",
];

const inputCls = "h-10 w-full rounded-full border border-[#e6ebf2] bg-white px-4 text-sm font-medium text-slate-800 shadow-[0_2px_6px_-4px_rgba(16,24,40,0.25)] placeholder:font-normal placeholder:text-slate-400 focus:border-[#1976d2] focus:outline-none focus:ring-4 focus:ring-[#1976d2]/20 dark:border-white/15 dark:bg-white/5 dark:text-white";
const inputErr = "border-red-400 focus:border-red-500 focus:ring-red-500/20";

function Kpi({ caption, value, tone }: { caption: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/25 bg-white/15 px-3.5 py-2.5 backdrop-blur-sm">
      <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/70">{caption}</p>
      <p className={cn(
        "truncate font-mono text-[15px] font-extrabold text-white",
        tone === "gain" && "text-emerald-200",
        tone === "loss" && "text-red-200"
      )}>{value}</p>
    </div>
  );
}

export function QuotationDialog({ quotation, forwarders, userEmail, quotations, onClose, onSaved }: {
  quotation: Quotation | null;
  forwarders: Forwarder[];
  userEmail: string;
  quotations: Quotation[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate } = useSWRConfig();
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      entity: quotation?.entity ?? "UAE",
      supplierName: quotation?.supplierName ?? "",
      supplierPO: quotation?.supplierPO ?? "",
      poValue: quotation?.poValue ?? 0,
      poValueCurrency: quotation?.poValueCurrency ?? "AED",
      origin: quotation?.origin ?? "",
      destination: quotation?.destination ?? "",
      mode: quotation?.mode ?? "",
      incoterms: quotation?.incoterms ?? "",
      size: quotation?.size ?? "",
      transitTime: quotation?.transitTime ?? "",
      etd: quotation?.etd ?? "",
      eta: quotation?.eta ?? "",
      remarks: quotation?.remarks ?? "",
      status: quotation?.status ?? "Pending",
      awardedTo: quotation?.awardedTo ?? "",
      savings: quotation?.savings ?? 0,
      quotes: quotation?.quotes?.length ? quotation.quotes : [{ forwarder: "", quotedAmount: 0, currency: "AED" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "quotes" });
  const poValueCurrency = useWatch({ control, name: "poValueCurrency" }) ?? "AED";
  const poValue = useWatch({ control, name: "poValue" }) ?? 0;
  const awardedTo = useWatch({ control, name: "awardedTo" }) ?? "";
  const statusVal = useWatch({ control, name: "status" }) ?? "Pending";
  const quotes = useWatch({ control, name: "quotes" });
  const originVal = useWatch({ control, name: "origin" }) ?? "";
  const destinationVal = useWatch({ control, name: "destination" }) ?? "";

  const validConverted = useMemo(() =>
    (quotes ?? []).filter((q) => q && q.quotedAmount > 0).map((q) => ({ ...q, conv: convertCurrency(q.quotedAmount, q.currency || "AED", poValueCurrency) })),
  [quotes, poValueCurrency]);
  const lowest = validConverted.length ? Math.min(...validConverted.map((q) => q.conv)) : 0;
  const highest = validConverted.length ? Math.max(...validConverted.map((q) => q.conv)) : 0;
  const ranged = validConverted.length > 1 && lowest !== highest;
  const maxConv = highest || 1;
  const spread = validConverted.length >= 2 ? highest - lowest : 0;
  const pct = poValue > 0 && lowest > 0 ? ((lowest / poValue) * 100).toFixed(2) : "0.00";
  const autoSavings = validConverted.length >= 2 ? calculateAwardSavings(quotes, poValueCurrency, awardedTo) : null;
  const ranked = useMemo(() => [...validConverted].sort((a, b) => a.conv - b.conv).map((q) => q.forwarder), [validConverted]);

  const submit = async (data: FormData) => {
    const valid = data.quotes.filter((q) => q.quotedAmount > 0);
    const conv = valid.map((q) => convertCurrency(q.quotedAmount, q.currency || "AED", data.poValueCurrency || "AED"));
    const low = conv.length ? Math.min(...conv) : 0;
    const pctVal = data.poValue > 0 ? (low / data.poValue) * 100 : 0;
    const savingsVal = valid.length >= 2 ? (calculateAwardSavings(valid, data.poValueCurrency || "AED", data.awardedTo) ?? 0) : (data.savings ?? 0);
    const payload = { ...data, percentage: Math.round(pctVal * 100) / 100, savings: savingsVal };
    if (quotation && quotation.id > 0) {
      const { percentage: _pct, ...rest } = payload;
      void _pct;
      await updateQuotationAPI(quotation.id, rest);
    } else {
      const dup = quotations.some((q) => q.supplierPO.trim().toLowerCase() === data.supplierPO.trim().toLowerCase() && q.entity === data.entity);
      if (dup) { alert(`A quotation already exists for PO "${data.supplierPO}" (${data.entity}).`); return; }
      const base = userEmail.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      await createQuotation({ ...payload, createdBy: base || "Unknown user", createdAt: new Date().toISOString() });
    }
    mutate("quotations");
    onSaved();
  };

  const toggleAward = (name: string) => {
    setValue("awardedTo", awardedTo === name ? "" : name, { shouldDirty: true });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-[28px] bg-[#e9edf3] shadow-[0_40px_90px_-30px_rgba(13,59,102,0.55)] sm:rounded-[28px] dark:bg-[#0c1210]" onClick={(e) => e.stopPropagation()}>
        {/* Gradient KPI header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0d3b66] via-[#1565c0] to-[#42a5f5] px-5 pb-5 pt-5 dark:from-[#081f38] dark:via-[#0d3b66] dark:to-[#1565c0]">
          <span className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-20 right-32 h-44 w-44 rounded-full bg-white/[0.07]" />
          <span className="pointer-events-none absolute left-1/3 top-0 h-24 w-24 rounded-full bg-white/[0.06]" />
          <div className="relative flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm">
              <IconTrophy size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold tracking-tight text-white">{quotation ? "Edit Quotation" : "New Quotation Request"}</span>
              <span className="block text-xs font-medium text-white/75">Fill in the details — totals, ranks and savings update live.</span>
            </span>
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/90 backdrop-blur-sm transition hover:bg-white/25">
              <IconX size={18} />
            </button>
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Kpi caption="PO Value" value={poValue > 0 ? `${poValueCurrency} ${Number(poValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"} />
            <Kpi caption="Lowest Quote" value={validConverted.length > 0 ? `${poValueCurrency} ${lowest.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"} />
            <Kpi caption="Freight %" value={`${pct}%`} />
            <Kpi
              caption={autoSavings === null ? "Savings" : autoSavings >= 0 ? "Total Savings" : "Extra Cost"}
              value={autoSavings === null ? "—" : `${poValueCurrency} ${Math.abs(autoSavings).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              tone={autoSavings === null ? undefined : autoSavings >= 0 ? "gain" : "loss"}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(submit as never)} className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <Section step="01" accent="blue" title="Shipment Details" hint="Supplier, PO and cargo information">
            <Field label="Entity" error={errors.entity?.message}>
              <select {...register("entity")} className={inputCls}>
                {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Supplier Name" icon={IconBuilding} error={errors.supplierName?.message} hint="Min. 2 characters">
              <input {...register("supplierName")} placeholder="e.g. Acme Corp, Global Trading LLC" className={`${inputCls} ${errors.supplierName ? inputErr : ""}`} />
            </Field>
            <Field label="PO Number" icon={IconHash} error={errors.supplierPO?.message} hint="Must be unique per entity">
              <input {...register("supplierPO")} placeholder="e.g. PO-987654" className={`${inputCls} ${errors.supplierPO ? inputErr : ""}`} />
            </Field>
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <Field label="PO Value" icon={IconCash} error={errors.poValue?.message}>
                <input type="number" min={1} step="any" {...register("poValue")} placeholder="0.00" className={`${inputCls} font-mono ${errors.poValue ? inputErr : ""}`} />
              </Field>
              <Field label="Currency">
                <select {...register("poValueCurrency")} className={inputCls}>
                  {CURRENCY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Cargo Size / Type" error={errors.size?.message}>
              <input {...register("size")} placeholder="e.g. 1x40 HQ, LCL" className={`${inputCls} ${errors.size ? inputErr : ""}`} />
            </Field>
            <Field label="Transit Time">
              <input {...register("transitTime")} placeholder="e.g. 25 Days" className={inputCls} />
            </Field>
          </Section>

          <Section step="02" accent="amber" title="Route & Schedule" hint="Ports, transport mode and dates">
            <div>
              <Field label="Origin Port / City" error={errors.origin?.message} hint="Search all 175 countries">
                <LocationCombobox
                  value={originVal}
                  onChange={(v) => setValue("origin", v, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Type a city or country…"
                  error={errors.origin?.message}
                />
              </Field>
            </div>
            <div>
              <Field label="Destination Port / City" error={errors.destination?.message} hint="Search all 175 countries">
                <LocationCombobox
                  value={destinationVal}
                  onChange={(v) => setValue("destination", v, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Type a city or country…"
                  error={errors.destination?.message}
                />
              </Field>
            </div>
            <Field label="Mode of Transport" icon={IconTruck} error={errors.mode?.message}>
              <select {...register("mode")} className={`${inputCls} ${errors.mode ? inputErr : ""}`}>
                <option value="">Select mode</option>
                {MODES_LIST.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Incoterms" error={errors.incoterms?.message}>
              <select {...register("incoterms")} className={`${inputCls} ${errors.incoterms ? inputErr : ""}`}>
                <option value="">Select incoterms</option>
                {INCOTERMS_LIST.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ETD" icon={IconCalendar}>
                <input type="date" {...register("etd")} className={inputCls} />
              </Field>
              <Field label="ETA" icon={IconCalendar} error={errors.eta?.message}>
                <input type="date" {...register("eta")} className={inputCls} />
              </Field>
            </div>
          </Section>

          <section className="overflow-hidden rounded-3xl border border-[#e6ebf2] bg-white shadow-[0_20px_45px_-28px_rgba(16,24,40,0.4)] dark:border-white/10 dark:bg-[#171d1b] dark:shadow-[0_20px_45px_-28px_rgba(0,0,0,0.8)]">
            <span className="block h-1.5 bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#a78bfa]" />
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#7c3aed]/12 text-sm font-extrabold text-[#7c3aed] shadow-sm dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]">03</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold tracking-tight">Forwarder Quotes</span>
                <span className="block truncate text-xs text-slate-400">One row per forwarder — tap ★ to award · converts to {poValueCurrency}</span>
              </span>
              {validConverted.length >= 2 && (
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-extrabold text-violet-600 dark:text-violet-300">
                  Spread {poValueCurrency} {spread.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              )}
              <button
                type="button"
                onClick={() => append({ forwarder: "", quotedAmount: 0, currency: "AED" })}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] px-4 py-2 text-[13px] font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.8)] transition hover:brightness-110 active:scale-[0.98]"
              >
                <IconPlus size={15} /> Add quote
              </button>
            </div>
            <div className="space-y-3 border-t border-[#e6ebf2]/70 bg-[#f6f2fe] p-4 sm:p-5 dark:border-white/5 dark:bg-white/[0.02]">
              {fields.map((f, i) => {
                const row = quotes?.[i];
                const amt = row?.quotedAmount ?? 0;
                const cur = row?.currency ?? "AED";
                const conv = amt > 0 ? convertCurrency(amt, cur || "AED", poValueCurrency) : 0;
                const rank = amt > 0 ? ranked.indexOf(row?.forwarder ?? `__${i}`) + 1 : 0;
                const isLow = ranged && conv === lowest;
                const isHigh = ranged && conv === highest;
                const isAwarded = awardedTo !== "" && awardedTo === row?.forwarder;
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "rounded-2xl border-2 bg-white p-3.5 shadow-[0_10px_25px_-20px_rgba(16,24,40,0.5)] transition-all dark:bg-white/[0.03]",
                      isAwarded
                        ? "border-amber-400 shadow-[0_10px_25px_-15px_rgba(217,155,40,0.7)]"
                        : isLow
                          ? "border-emerald-400"
                          : isHigh
                            ? "border-red-300 dark:border-red-500/40"
                            : "border-[#e6ebf2] dark:border-white/10"
                    )}
                  >
                    <div className="grid grid-cols-[34px_1fr_92px_130px_36px] items-center gap-2">
                      <span className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold",
                        rank >= 1 && rank <= 3 ? RANK_MEDAL[rank - 1] : "bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                      )}>
                        {rank > 0 ? rank : i + 1}
                      </span>
                      <select {...register(`quotes.${i}.forwarder` as const)} className={`${inputCls} !h-10`}>
                        <option value="">Select forwarder</option>
                        {forwarders.map((fw) => <option key={fw.id} value={fw.name}>{fw.name}</option>)}
                      </select>
                      <select {...register(`quotes.${i}.currency` as const)} className={`${inputCls} !h-10 px-2`}>
                        {CURRENCY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="number" min={0} step="any" {...register(`quotes.${i}.quotedAmount` as const)} placeholder="0.00" className={`${inputCls} !h-10 font-mono`} />
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => row?.forwarder && toggleAward(row.forwarder)}
                          title={isAwarded ? "Unaward" : "Award this quote"}
                          aria-label={`Award quote ${i + 1}`}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95",
                            isAwarded
                              ? "bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-[0_8px_18px_-8px_rgba(245,158,11,0.9)]"
                              : "border border-[#e6ebf2] text-slate-300 hover:border-amber-400 hover:text-amber-500 dark:border-white/15"
                          )}
                        >
                          {isAwarded ? <IconStarFilled size={17} /> : <IconStar size={17} />}
                        </button>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(i)} aria-label={`Remove quote ${i + 1}`} className="flex h-9 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-600">
                            <IconX size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                    {amt > 0 && (
                      <div className="mt-2.5 pl-[42px]">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className={cn("h-full rounded-full transition-all", isLow ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : isHigh ? "bg-gradient-to-r from-red-500 to-red-300" : "bg-gradient-to-r from-[#1976d2] to-[#42a5f5]")}
                            style={{ width: `${Math.min(100, (conv / maxConv) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-500 dark:text-slate-300">
                            {poValueCurrency} {conv.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            {cur !== poValueCurrency && <span className="font-normal text-slate-400"> · {cur} {amt.toLocaleString()}</span>}
                          </span>
                          <span className="flex gap-1.5">
                            {isLow && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">Lowest</span>}
                            {isHigh && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">Highest</span>}
                            {isAwarded && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">Awarded</span>}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {errors.quotes && <p className="text-xs font-semibold text-red-600">{errors.quotes.message as string}</p>}
            </div>
          </section>

          <Section step="04" accent="emerald" title="Award & Status" hint="Decision, approval state and notes" wide
            stat={autoSavings !== null ? (
              <span className={cn(
                "rounded-full px-4 py-1.5 font-mono text-sm font-extrabold shadow-sm",
                autoSavings >= 0
                  ? "bg-emerald-500/15 text-emerald-700 shadow-[0_0_20px_-6px_rgba(22,130,86,0.6)] dark:text-emerald-300"
                  : "bg-red-500/15 text-red-700 shadow-[0_0_20px_-6px_rgba(194,65,45,0.6)] dark:text-red-300"
              )}>
                {autoSavings >= 0 ? "+" : "−"}{poValueCurrency} {Math.abs(autoSavings).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            ) : undefined}
          >
            <div className="sm:col-span-2">
              <Label>Quotation Status</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_LIST.map((s) => {
                  const selected = statusVal === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue("status", s, { shouldDirty: true })}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all active:scale-95",
                        selected
                          ? "bg-gradient-to-b from-[#42a5f5] to-[#1976d2] text-white shadow-[0_8px_18px_-8px_rgba(25,118,210,0.8)]"
                          : "border border-[#e6ebf2] bg-white text-slate-500 hover:border-[#1976d2]/50 hover:text-[#1976d2] dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Savings {validConverted.length >= 2 ? "(auto)" : "(manual)"}</Label>
              {autoSavings !== null ? (
                <p className={cn(
                  "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-extrabold",
                  autoSavings >= 0
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                )}>
                  <IconCheck size={15} />
                  {poValueCurrency} {Math.abs(autoSavings).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              ) : (
                <input type="number" step="any" {...register("savings")} placeholder="0.00" className={`${inputCls} font-mono`} />
              )}
              {autoSavings === null && <p className="mt-1 text-xs text-slate-400">Auto-calculates once 2+ quotes exist.</p>}
            </div>
            <div className="sm:col-span-2">
              <Label>Awarded To Forwarder</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {forwarders.length === 0 && <p className="text-xs text-slate-400">No forwarders registered yet.</p>}
                {forwarders.map((fw) => {
                  const q = validConverted.find((x) => x.forwarder === fw.name);
                  const selected = awardedTo === fw.name;
                  const isLow = selected && q !== undefined && ranged && q.conv === lowest;
                  return (
                    <button
                      key={fw.id}
                      type="button"
                      onClick={() => toggleAward(fw.name)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-all active:scale-[0.98]",
                        selected
                          ? "border-amber-400 bg-amber-50/60 shadow-[0_10px_25px_-15px_rgba(217,155,40,0.8)] dark:border-amber-500/50 dark:bg-amber-500/10"
                          : "border-[#e6ebf2] bg-white hover:border-amber-300 dark:border-white/10 dark:bg-white/5"
                      )}
                    >
                      <span className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold",
                        selected ? "bg-gradient-to-b from-amber-300 to-amber-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                      )}>
                        {selected ? <IconStarFilled size={16} /> : fw.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold">{fw.name}</span>
                        <span className="block font-mono text-xs text-slate-500">
                          {q ? `${poValueCurrency} ${q.conv.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "No quote yet"}
                        </span>
                      </span>
                      {isLow && <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">Lowest</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Field label="Remarks & Notes" icon={IconNote} hint="Freight notes, special instructions">
                <textarea {...register("remarks")} rows={4} placeholder="Add any freight notes, special instructions…" className={`${inputCls} !rounded-3xl h-auto py-3 leading-relaxed`} />
              </Field>
            </div>
          </Section>

          <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-3xl border border-[#e6ebf2] bg-white/90 px-4 py-3 shadow-[0_-12px_30px_-20px_rgba(16,24,40,0.4)] backdrop-blur-md dark:border-white/10 dark:bg-[#171d1b]/90">
            <p className="mr-auto text-xs font-semibold text-slate-400">
              {validConverted.length > 0
                ? <><b className="text-slate-600 dark:text-slate-200">{validConverted.length} quote{validConverted.length !== 1 ? "s" : ""}</b> · lowest <b className="font-mono text-slate-600 dark:text-slate-200">{poValueCurrency} {lowest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b> · <b className="text-slate-600 dark:text-slate-200">{pct}%</b> of PO</>
                : "Add at least one quote with a positive amount"}
            </p>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{quotation ? "Update Quotation" : "Submit Quotation"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
