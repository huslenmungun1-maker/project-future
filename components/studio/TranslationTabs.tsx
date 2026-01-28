"use client";

import { useMemo, useState } from "react";

type Locale = "en" | "ko" | "mn" | "ja";

const LOCALES: Locale[] = ["en", "ko", "mn", "ja"];

export function TranslationTabs({
  initialLocale = "en",
  children,
}: {
  initialLocale?: Locale;
  children: (activeLocale: Locale) => React.ReactNode;
}) {
  const [active, setActive] = useState<Locale>(initialLocale);

  const labels = useMemo(
    () => ({
      en: "English",
      ko: "한국어",
      mn: "Монгол",
      ja: "日本語",
    }),
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {LOCALES.map((l) => {
          const isActive = l === active;
          return (
            <button
              key={l}
              type="button"
              onClick={() => setActive(l)}
              className={
                isActive
                  ? "rounded-lg border border-emerald-400 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200"
                  : "rounded-lg border border-slate-700 bg-black/40 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
              }
            >
              {labels[l]}
            </button>
          );
        })}
      </div>

      <div>{children(active)}</div>
    </div>
  );
}
