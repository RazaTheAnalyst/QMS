"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { convertCurrency, calculateAwardSavings, type Quotation } from "@/lib/domain";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type RangeKey = "week" | "month" | "half";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "half", label: "Last 6 Months" },
];

const DAY = 86400000;

function startOfWeek(d: Date) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (c.getDay() + 6) % 7; // Monday = 0
  return new Date(c.getTime() - dow * DAY);
}

/**
 * Total-Orders-style trend: smooth PO value vs awarded-freight curves
 * with a range pill selector, mirroring the MaterialM analytics card.
 */
export function FreightTrend({ quotations, currency }: { quotations: Quotation[]; currency: string }) {
  const [range, setRange] = useState<RangeKey>("week");

  const { labels, po, freight, savings } = useMemo(() => {
    const now = new Date();
    const blank = (n: number) => ({ po: new Array(n).fill(0), freight: new Array(n).fill(0), savings: new Array(n).fill(0) });
    const addQuote = (bucket: { po: number[]; freight: number[]; savings: number[] }, idx: number, q: Quotation) => {
      bucket.po[idx] += convertCurrency(q.poValue, q.poValueCurrency || "AED", currency);
      if (q.awardedTo) {
        const quote = q.quotes.find((x) => x.forwarder === q.awardedTo);
        if (quote) bucket.freight[idx] += convertCurrency(quote.quotedAmount, quote.currency || "AED", currency);
      }
      const s = calculateAwardSavings(q.quotes, q.poValueCurrency || "AED", q.awardedTo) ?? q.savings ?? 0;
      bucket.savings[idx] += convertCurrency(s, q.poValueCurrency || "AED", currency);
    };
    if (range === "week") {
      const start = startOfWeek(now).getTime();
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const b = blank(7);
      for (const q of quotations) {
        if (!q.createdAt || q.excludedFromPO) continue;
        const ts = new Date(q.createdAt).getTime();
        if (isNaN(ts)) continue;
        const idx = Math.floor((ts - start) / DAY);
        if (idx < 0 || idx > 6) continue;
        addQuote(b, idx, q);
      }
      return { labels, ...b };
    }
    if (range === "month") {
      const labels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];
      const b = blank(4);
      for (const q of quotations) {
        if (!q.createdAt || q.excludedFromPO) continue;
        const d = new Date(q.createdAt);
        if (isNaN(d.getTime()) || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue;
        addQuote(b, Math.min(3, Math.floor((d.getDate() - 1) / 7)), q);
      }
      return { labels, ...b };
    }
    const labels: string[] = [];
    const b = blank(6);
    for (let back = 5; back >= 0; back--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - back, 1);
      labels.push(ref.toLocaleString("en-US", { month: "short" }));
      const idx = 5 - back;
      for (const q of quotations) {
        if (!q.createdAt || q.excludedFromPO) continue;
        const d = new Date(q.createdAt);
        if (isNaN(d.getTime()) || d.getMonth() !== ref.getMonth() || d.getFullYear() !== ref.getFullYear()) continue;
        addQuote(b, idx, q);
      }
    }
    return { labels, po: b.po.map(Math.round), freight: b.freight.map(Math.round), savings: b.savings.map(Math.round) };
  }, [quotations, currency, range]);

  const kFmt = (v: number) => {
    const a = Math.abs(v);
    if (a >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
    return `${Math.round(v)}`;
  };

  return (
    <Card>
      <CardContent>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold tracking-tight">Freight Awards</p>
            <p className="text-xs text-slate-500">PO, freight and savings trends · {currency}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[#e6ebf2] p-1 dark:border-white/10">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${range === r.key ? "bg-[#1976d2] text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <Chart
          type="area"
          height={280}
          series={[
            { name: "PO Value", data: po.map(Math.round) },
            { name: "Awarded Freight", data: freight.map(Math.round) },
            { name: "Savings", data: savings.map(Math.round) },
          ]}
          options={{
            chart: { toolbar: { show: false }, zoom: { enabled: false } },
            colors: ["#3b82f6", "#8b5cf6", "#10b981"],
            stroke: { curve: "smooth", width: 3 },
            fill: {
              type: "gradient",
              gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 100] },
            },
            markers: { size: 0, hover: { size: 5 } },
            grid: { borderColor: "#e6ebf2", strokeDashArray: 5 },
            xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#94a3b8", fontSize: "12px" } } },
            yaxis: { labels: { formatter: kFmt, style: { colors: "#94a3b8", fontSize: "12px" } } },
            legend: { position: "bottom", horizontalAlign: "center", markers: { size: 8 } },
            dataLabels: { enabled: false },
            tooltip: { y: { formatter: (v: number) => `${currency} ${Math.round(v).toLocaleString()}` } },
          }}
        />
      </CardContent>
    </Card>
  );
}
