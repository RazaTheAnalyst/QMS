"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/locations";
import { IconMapPin } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const RENDER_CAP = 40;

/**
 * Inline combobox: type directly in the field to filter all 175 countries.
 * Selecting a city fills "City, Country". Any typed text is kept as-is.
 */
export function LocationCombobox({ value, onChange, placeholder, error }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = (revert: boolean) => {
    if (revert) {
      setTerm(value);
      onChange(value);
    }
    setOpen(false);
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const { groups, totalGroups } = useMemo(() => {
    const t = term.trim().toLowerCase();
    // Exact country name: jump straight to it — no scrolling needed.
    const exact = t ? COUNTRIES.find((c) => c.name.toLowerCase() === t) : undefined;
    if (exact) return { groups: [{ country: exact.name, cities: exact.cities }], totalGroups: 1 };
    const countryHits: Array<{ country: string; cities: string[] }> = [];
    const cityHits: Array<{ country: string; cities: string[] }> = [];
    for (const c of COUNTRIES) {
      if (!t) {
        countryHits.push({ country: c.name, cities: c.cities });
      } else if (c.name.toLowerCase().includes(t)) {
        countryHits.push({ country: c.name, cities: c.cities });
      } else {
        const cities = c.cities.filter((city) => city.toLowerCase().includes(t));
        if (cities.length > 0) cityHits.push({ country: c.name, cities });
      }
    }
    const all = [...countryHits, ...cityHits];
    return { groups: all.slice(0, RENDER_CAP), totalGroups: all.length };
  }, [term]);

  const pick = (city: string, country: string) => {
    const full = `${city}, ${country}`;
    setTerm(full);
    onChange(full);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <IconMapPin size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
      <input
        value={term}
        onChange={(e) => { setTerm(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const first = groups[0];
            if (term.trim() && first?.cities[0]) pick(first.cities[0], first.country);
            else setOpen(false);
          }
        }}
        placeholder={placeholder || "Type a city or country…"}
        className={cn(
          "h-10 w-full rounded-full border bg-white pl-9 pr-4 text-sm font-medium shadow-[0_1px_2px_rgba(16,24,40,0.04)] placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-white/5 dark:text-white",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
            : "border-[#e6ebf2] text-slate-800 focus:border-[#1976d2] focus:ring-[#1976d2]/15 dark:border-white/15"
        )}
      />

      {open && (
        <div className="absolute z-30 mt-2 w-full min-w-[260px] overflow-hidden rounded-2xl border border-[#e6ebf2] bg-white shadow-xl dark:border-white/10 dark:bg-[#171d1b]">
          <div className="max-h-[320px] overflow-y-auto p-2">
            {groups.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-slate-400">
                No matching locations — your text will be saved as-is.
              </p>
            )}
            {groups.map((g) => (
              <div key={g.country} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#1976d2]">
                  {g.country}
                </p>
                <div className="flex flex-wrap gap-1.5 px-1 py-1">
                  {g.cities.map((city) => {
                    const full = `${city}, ${g.country}`;
                    const selected = value === full;
                    return (
                      <button
                        key={city}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(city, g.country)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                          selected
                            ? "bg-[#1976d2] text-white"
                            : "border border-[#e6ebf2] text-slate-600 hover:border-[#1976d2] hover:text-[#1976d2] dark:border-white/15 dark:text-slate-300"
                        )}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {totalGroups > groups.length && (
              <p className="px-2 py-2 text-center text-[11px] font-semibold text-slate-400">
                +{totalGroups - groups.length} more — keep typing to refine
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
