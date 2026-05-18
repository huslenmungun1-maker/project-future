"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { safeLocale } from "@/lib/i18n";

const PLACEHOLDERS = {
  en: "Search titles, genres, series…",
  ko: "제목, 장르, 시리즈 검색…",
  mn: "Гарчиг, жанр, цуврал хайх…",
  ja: "タイトル、ジャンル、シリーズを検索…",
} as const;

const BUTTON_LABELS = {
  en: "Search",
  ko: "검색",
  mn: "Хайх",
  ja: "検索",
} as const;

type SupportedLocale = keyof typeof PLACEHOLDERS;

export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = (safeLocale(params?.locale) as SupportedLocale) || "en";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push(`/${locale}/reader`);
      return;
    }
    router.push(`/${locale}/reader?q=${encodeURIComponent(q)}`);
  }

  const hasQuery = query.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 520 }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          borderRadius: 9999,
          background: focused ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.80)",
          border: `1.5px solid ${focused ? "rgba(94,99,87,0.30)" : "rgba(94,99,87,0.16)"}`,
          boxShadow: focused
            ? "0 0 0 5px rgba(94,99,87,0.08), 0 6px 32px rgba(0,0,0,0.11)"
            : "0 3px 14px rgba(0,0,0,0.07)",
          transition: "border-color 220ms ease, box-shadow 240ms ease, background 220ms ease",
        }}
      >
        {/* Search icon */}
        <svg
          width="16" height="16" viewBox="0 0 15 15" fill="none"
          style={{
            position: "absolute",
            left: 18,
            flexShrink: 0,
            pointerEvents: "none",
            opacity: focused ? 0.65 : 0.32,
            transition: "opacity 220ms ease",
          }}
        >
          <circle cx="6.3" cy="6.3" r="4.8" stroke="var(--accent)" strokeWidth="1.6" />
          <path d="M10 10L13 13" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PLACEHOLDERS[locale]}
          style={{
            flex: 1,
            padding: "14px 8px 14px 46px",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 14,
            color: "var(--text)",
            fontWeight: 400,
            minWidth: 0,
          }}
        />

        <button
          type="submit"
          style={{
            flexShrink: 0,
            margin: "5px 5px 5px 0",
            padding: "9px 18px",
            borderRadius: 9999,
            background: hasQuery ? "var(--accent)" : "rgba(94,99,87,0.10)",
            color: hasQuery ? "#f8f7f3" : "rgba(94,99,87,0.42)",
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.02em",
            cursor: "pointer",
            transition: "background 200ms ease, color 200ms ease",
            whiteSpace: "nowrap",
          }}
        >
          {BUTTON_LABELS[locale]}
        </button>
      </div>
    </form>
  );
}
