"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SupportedLocale = "en" | "ko" | "mn" | "ja";

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

function stripLeadingLocale(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return "/";

  const first = parts[0];
  if (["en", "ko", "mn", "ja"].includes(first)) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }

  return pathname;
}

const LABEL: Record<SupportedLocale, string> = {
  en: "EN",
  ko: "KO",
  mn: "MN",
  ja: "JA",
};

const UI_TEXT = {
  en: {
    reader: "Reader",
    studio: "Studio",
    publisher: "Publisher",
  },
  ko: {
    reader: "리더",
    studio: "스튜디오",
    publisher: "퍼블리셔",
  },
  mn: {
    reader: "Уншигч",
    studio: "Студи",
    publisher: "Нийтлэгч",
  },
  ja: {
    reader: "リーダー",
    studio: "スタジオ",
    publisher: "パブリッシャー",
  },
} as const;

export default function NavBar({ locale }: { locale: string }) {
  const pathname = usePathname() || "/";
  const currentLocale = normalizeLocale(locale);
  const t = UI_TEXT[currentLocale];
  const restPath = stripLeadingLocale(pathname);

  const mkHref = (nextLocale: SupportedLocale) => {
    return restPath === "/" ? `/${nextLocale}` : `/${nextLocale}${restPath}`;
  };

  return (
    <nav className="flex h-16 items-center justify-between">
      <div className="flex items-center gap-8">
        <Link
          href={`/${currentLocale}`}
          className="flex items-center gap-3 font-semibold tracking-tight text-stone-900 hover:opacity-80"
        >
          <img
            src="/logo.png"
            alt="Enkhverse"
            className="h-18 w-auto object-contain mr-2"
          />
          <span className="text-base text-stone-900">Enkhverse</span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link
            href={`/${currentLocale}/reader`}
            className="text-stone-700 transition hover:text-stone-950"
          >
            {t.reader}
          </Link>

          <Link
            href={`/${currentLocale}/studio`}
            className="text-stone-700 transition hover:text-stone-950"
          >
            {t.studio}
          </Link>

          <Link
            href={`/${currentLocale}/publisher/books`}
            className="text-stone-700 transition hover:text-stone-950"
          >
            {t.publisher}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["en", "ko", "mn", "ja"] as SupportedLocale[]).map((l) => {
          const active = l === currentLocale;

          return (
            <Link
              key={l}
              href={mkHref(l)}
              className={
                active
                  ? "rounded-full border border-stone-900 bg-stone-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white"
                  : "rounded-full border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              }
              aria-current={active ? "page" : undefined}
            >
              {LABEL[l]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}