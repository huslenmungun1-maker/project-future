"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SupportedLocale = "en" | "ko" | "mn" | "ja";

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

function stripLeadingLocale(pathname: string) {
  // "/en/reader/series/..." -> "/reader/series/..."
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  const first = parts[0];
  if (["en", "ko", "mn", "ja"].includes(first)) {
    const rest = parts.slice(1).join("/");
    return "/" + rest; // may become "/"
  }
  return pathname;
}

const LABEL: Record<SupportedLocale, string> = {
  en: "EN",
  ko: "KO",
  mn: "MN",
  ja: "JA",
};

export default function NavBar({ locale }: { locale: string }) {
  const currentLocale = normalizeLocale(locale);
  const pathname = usePathname() || "/";
  const restPath = stripLeadingLocale(pathname); // keep same page

  const mkHref = (l: SupportedLocale) => {
    // handle root cleanly
    return restPath === "/" ? `/${l}` : `/${l}${restPath}`;
  };

  return (
    <nav className="flex items-center justify-between gap-4">
      {/* Left: site links */}
      <div className="flex items-center gap-3 text-sm">
        <Link
          href={`/${currentLocale}`}
          className="font-semibold tracking-tight hover:text-slate-200"
        >
          Project Future
        </Link>

        <Link
          href={`/${currentLocale}/reader`}
          className="text-slate-300 hover:text-white"
        >
          Reader
        </Link>

        <Link
          href={`/${currentLocale}/studio`}
          className="text-slate-300 hover:text-white"
        >
          Studio
        </Link>

        <Link
          href={`/${currentLocale}/publisher`}
          className="text-slate-300 hover:text-white"
        >
          Publisher
        </Link>
      </div>

      {/* Right: language switcher (appears on EVERY page) */}
      <div className="flex items-center gap-2">
        {(["en", "ko", "mn", "ja"] as SupportedLocale[]).map((l) => {
          const active = l === currentLocale;
          return (
            <Link
              key={l}
              href={mkHref(l)}
              className={
                active
                  ? "rounded-lg border border-emerald-400 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200"
                  : "rounded-lg border border-slate-700 bg-black/40 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500"
              }
              aria-current={active ? "page" : undefined}
              title={`Switch to ${l.toUpperCase()}`}
            >
              {LABEL[l]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
