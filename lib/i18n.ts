// lib/i18n.ts
export const SUPPORTED_LOCALES = ["en", "ko", "mn", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function safeLocale(raw: unknown, fallback: Locale = "en"): Locale {
  const s = typeof raw === "string" ? raw : "";
  return (SUPPORTED_LOCALES as readonly string[]).includes(s)
    ? (s as Locale)
    : fallback;
}

export function withLocale(locale: Locale, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}
