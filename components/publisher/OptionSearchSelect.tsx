"use client";

import { useMemo, useState } from "react";
import type { Locale, OptionItem } from "@/lib/publisher-options";
import { getLocalizedLabel, searchOptions } from "@/lib/publisher-options";

type Props = {
  label: string;
  locale: Locale;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function OptionSearchSelect({
  label,
  locale,
  options,
  value,
  onChange,
  placeholder = "Search...",
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return searchOptions(options, query, locale).slice(0, 12);
  }, [options, query, locale]);

  const selected = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">{label}</label>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm text-slate-100 outline-none focus:border-fuchsia-400"
      />

      {selected && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Selected: {getLocalizedLabel(selected, locale)}
        </div>
      )}

      <div className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-400">No results.</div>
        ) : (
          filtered.map((opt) => {
            const active = opt.value === value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                  active
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>{getLocalizedLabel(opt, locale)}</span>
                <span className="text-[10px] text-slate-500">{opt.value}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}