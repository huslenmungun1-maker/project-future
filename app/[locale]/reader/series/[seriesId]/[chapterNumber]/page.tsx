"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";
type SupportedLocale = "en" | "mn" | "ko" | "ja";

type SeriesBaseRow = {
  id: string;
  created_at: string;
  cover_url?: string | null;
  cover_image_url?: string | null;
  published?: boolean | null;
  published_at?: string | null;
  default_locale?: string | null;
  title?: string | null;
  description?: string | null;
  views?: number | null;
  project_type?: string | null;
};

type ChapterPageRow = {
  id: string;
  order_index: number;
  image_url: string;
};

type SeriesTranslationRow = {
  series_id: string;
  locale: SupportedLocale;
  title: string;
  description: string | null;
};

type ChapterBaseRow = {
  id: string;
  series_id: string;
  chapter_number: number;
  created_at: string;
  title: string | null;
  content: string | null;
  is_published?: boolean | null;
  published_at?: string | null;
  price?: number | null;
};

type ChapterTranslationRow = {
  chapter_id: string;
  locale: SupportedLocale;
  title: string;
  script: string | null;
};

const UI_TEXT = {
  en: {
    backToReader: "Back to Reader",
    chip: "Reader · Series",
    loading: "Loading…",
    notFound: "Series or chapter not found.",
    supabaseError: "Could not load series/chapter.",
    chapter: "Chapter",
    next: "Next",
    prev: "Prev",
    createdAt: "Created",
    noContent: "No content yet for this chapter.",
    views: "views",
    untitledSeries: "Untitled series",
    locked: "This chapter requires a one-time purchase.",
    unlock: "Unlock for",
    unlocking: "Unlocking…",
    unlocked: "Chapter unlocked.",
    insufficientBalance: "Insufficient balance.",
    topupWallet: "Add funds",
    unlockError: "Could not unlock chapter.",
    loginToUnlock: "Sign in to unlock this chapter.",
  },
  mn: {
    backToReader: "Уншигч руу буцах",
    chip: "Уншигч · Цуврал",
    loading: "Ачаалж байна…",
    notFound: "Цуврал эсвэл бүлэг олдсонгүй.",
    supabaseError: "Цуврал/бүлгийг ачаалж чадсангүй.",
    chapter: "Бүлэг",
    next: "Дараах",
    prev: "Өмнөх",
    createdAt: "Үүсгэсэн",
    noContent: "Энэ бүлэгт одоогоор контент алга.",
    views: "үзэлт",
    untitledSeries: "Нэргүй цуврал",
    locked: "Энэ бүлэг нэг удаагийн худалдан авалт шаарддаг.",
    unlock: "Нээх",
    unlocking: "Нээж байна…",
    unlocked: "Бүлэг нээгдлээ.",
    insufficientBalance: "Үлдэгдэл хүрэлцэхгүй.",
    topupWallet: "Мөнгө нэмэх",
    unlockError: "Бүлэг нээж чадсангүй.",
    loginToUnlock: "Нэвтэрч орно уу.",
  },
  ko: {
    backToReader: "리더로 돌아가기",
    chip: "리더 · 시리즈",
    loading: "불러오는 중…",
    notFound: "시리즈 또는 챕터를 찾을 수 없습니다.",
    supabaseError: "시리즈/챕터를 불러올 수 없습니다.",
    chapter: "챕터",
    next: "다음",
    prev: "이전",
    createdAt: "생성일",
    noContent: "이 챕터에는 아직 내용이 없습니다.",
    views: "조회수",
    untitledSeries: "제목 없는 시리즈",
    locked: "이 챕터는 일회성 구매가 필요합니다.",
    unlock: "잠금 해제",
    unlocking: "처리 중…",
    unlocked: "챕터 잠금 해제 완료.",
    insufficientBalance: "잔액이 부족합니다.",
    topupWallet: "충전",
    unlockError: "챕터를 열 수 없습니다.",
    loginToUnlock: "로그인 후 이용해주세요.",
  },
  ja: {
    backToReader: "リーダーへ戻る",
    chip: "リーダー · シリーズ",
    loading: "読み込み中…",
    notFound: "シリーズまたはチャプターが見つかりません。",
    supabaseError: "シリーズ/チャプターを読み込めません。",
    chapter: "チャプター",
    next: "次へ",
    prev: "前へ",
    createdAt: "作成日",
    noContent: "このチャプターにはまだ内容がありません。",
    views: "閲覧",
    untitledSeries: "無題のシリーズ",
    locked: "このチャプターは一度限りの購入が必要です。",
    unlock: "アンロック",
    unlocking: "処理中…",
    unlocked: "チャプターをアンロックしました。",
    insufficientBalance: "残高が不足しています。",
    topupWallet: "チャージ",
    unlockError: "チャプターをアンロックできませんでした。",
    loginToUnlock: "ログインしてください。",
  },
} as const;

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

async function fetchSeriesTranslation(seriesId: string, locale: SupportedLocale) {
  const { data: tr1 } = await supabase
    .from("series_translations")
    .select("series_id, locale, title, description")
    .eq("series_id", seriesId)
    .eq("locale", locale)
    .maybeSingle();

  if (tr1) return tr1 as SeriesTranslationRow;

  const { data: tr2 } = await supabase
    .from("series_translations")
    .select("series_id, locale, title, description")
    .eq("series_id", seriesId)
    .eq("locale", "en")
    .maybeSingle();

  if (tr2) return tr2 as SeriesTranslationRow;

  return null;
}

async function fetchChapterTranslations(
  chapterIds: string[],
  locale: SupportedLocale
): Promise<Map<string, ChapterTranslationRow>> {
  const map = new Map<string, ChapterTranslationRow>();

  if (chapterIds.length === 0) return map;

  const { data: localeRows } = await supabase
    .from("chapter_translations")
    .select("chapter_id, locale, title, script")
    .eq("locale", locale)
    .in("chapter_id", chapterIds);

  for (const row of (localeRows as ChapterTranslationRow[] | null) || []) {
    map.set(row.chapter_id, row);
  }

  const missingIds = chapterIds.filter((id) => !map.has(id));
  if (missingIds.length === 0) return map;

  const { data: enRows } = await supabase
    .from("chapter_translations")
    .select("chapter_id, locale, title, script")
    .eq("locale", "en")
    .in("chapter_id", missingIds);

  for (const row of (enRows as ChapterTranslationRow[] | null) || []) {
    if (!map.has(row.chapter_id)) {
      map.set(row.chapter_id, row);
    }
  }

  return map;
}

export default function ReaderSeriesChapterPage() {
  const params = useParams() as Record<string, string | string[]>;

  const locale = normalizeLocale(String(params.locale || "en"));
  const seriesId = String(params.seriesId || "");
  const chapterNumber = Number(String(params.chapterNumber || params.chapter || "1")) || 1;

  const t = UI_TEXT[locale];

  const authClient = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const stripeVerified = useRef(false);

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [seriesBase, setSeriesBase] = useState<SeriesBaseRow | null>(null);
  const [seriesTr, setSeriesTr] = useState<SeriesTranslationRow | null>(null);

  const [chapters, setChapters] = useState<ChapterBaseRow[]>([]);
  const [chapterTranslations, setChapterTranslations] = useState<
    Map<string, ChapterTranslationRow>
  >(new Map());

  const [views, setViews] = useState<number>(0);
  const [chapterPages, setChapterPages] = useState<ChapterPageRow[]>([]);

  useEffect(() => {
    authClient.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [authClient]);

  const localeForDate = useMemo(() => {
    return locale === "mn"
      ? "mn-MN"
      : locale === "ko"
      ? "ko-KR"
      : locale === "ja"
      ? "ja-JP"
      : "en-GB";
  }, [locale]);

  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.chapter_number === chapterNumber) || null;
  }, [chapters, chapterNumber]);

  const currentChapterTranslation = useMemo(() => {
    if (!currentChapter) return null;
    return chapterTranslations.get(currentChapter.id) || null;
  }, [chapterTranslations, currentChapter]);

  const currentChapterIndex = useMemo(() => {
    return chapters.findIndex((c) => c.chapter_number === chapterNumber);
  }, [chapters, chapterNumber]);

  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
      ? chapters[currentChapterIndex + 1]
      : null;

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      setMessage("");
      setSeriesBase(null);
      setSeriesTr(null);
      setChapters([]);
      setChapterTranslations(new Map());
      setViews(0);
      setChapterPages([]);

      if (!seriesId) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from("series")
        .select(
          "id, created_at, cover_url, cover_image_url, published, published_at, default_locale, title, description, views, project_type"
        )
        .eq("id", seriesId)
        .maybeSingle();

      if (sErr || !s) {
        setStatus("error");
        setMessage(t.supabaseError);
        return;
      }

      const isSeriesPublished = Boolean(s.published) || Boolean(s.published_at);
      if (!isSeriesPublished) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const seriesRow = s as SeriesBaseRow;
      setSeriesBase(seriesRow);
      setViews(Number(seriesRow.views ?? 0) + 1);

      try {
        await supabase.rpc("increment_series_views", { target_id: seriesId });
      } catch {
        try {
          const current = Number(seriesRow.views ?? 0);
          await supabase.from("series").update({ views: current + 1 }).eq("id", seriesId);
        } catch {
          // ignore
        }
      }

      const sTr = await fetchSeriesTranslation(seriesId, locale);
      setSeriesTr(sTr);

      const { data: allChapters, error: cErr } = await supabase
        .from("chapters")
        .select(
          "id, series_id, chapter_number, created_at, title, content, is_published, published_at, price"
        )
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true });

      if (cErr || !allChapters) {
        setStatus("error");
        setMessage(t.supabaseError);
        return;
      }

      const publishedChapters = (allChapters as ChapterBaseRow[]).filter(
        (ch) => Boolean(ch.is_published) || Boolean(ch.published_at)
      );

      if (publishedChapters.length === 0) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const foundCurrent = publishedChapters.find((ch) => ch.chapter_number === chapterNumber);
      if (!foundCurrent) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      setChapters(publishedChapters);

      const trMap = await fetchChapterTranslations(
        publishedChapters.map((ch) => ch.id),
        locale
      );
      setChapterTranslations(trMap);

      // Load manga pages if applicable
      const projectType = (s as SeriesBaseRow).project_type;
      if (projectType === "manga" || projectType === "webtoon" || projectType === "comic") {
        const { data: pages } = await supabase
          .from("chapter_pages")
          .select("id, order_index, image_url")
          .eq("chapter_id", foundCurrent.id)
          .order("order_index", { ascending: true });
        setChapterPages((pages as ChapterPageRow[]) || []);
      }

      // Save read progress + check unlock for paid chapters
      try {
        const { data: { user } } = await authClient.auth.getUser();
        if (user) {
          await authClient
            .from("read_progress")
            .upsert(
              { user_id: user.id, series_id: seriesId, chapter_id: foundCurrent.id, updated_at: new Date().toISOString() },
              { onConflict: "user_id,series_id" }
            );

          const chapterPrice = Number(foundCurrent.price ?? 0);
          if (chapterPrice > 0 && !stripeVerified.current) {
            const { data: unlock } = await authClient
              .from("chapter_unlocks")
              .select("id")
              .eq("user_id", user.id)
              .eq("chapter_id", foundCurrent.id)
              .maybeSingle();
            let hasAccess = !!unlock;
            if (!hasAccess) {
              const { data: purchase } = await authClient
                .from("purchases")
                .select("id")
                .eq("user_id", user.id)
                .eq("chapter_id", foundCurrent.id)
                .maybeSingle();
              hasAccess = !!purchase;
            }
            if (!stripeVerified.current) setIsUnlocked(hasAccess);
          } else if (!stripeVerified.current) {
            setIsUnlocked(chapterPrice === 0);
          }
        } else {
          const chapterPrice = Number(foundCurrent.price ?? 0);
          if (!stripeVerified.current) setIsUnlocked(chapterPrice === 0);
        }
      } catch {
        if (!stripeVerified.current) setIsUnlocked(true);
      }

      setStatus("ok");
    };

    load();
  }, [seriesId, chapterNumber, locale, t.notFound, t.supabaseError]);

  const chapterPrice = Number(currentChapter?.price ?? 0);
  const isPaidChapter = chapterPrice > 0;

  // Handle Stripe redirect back with session_id in URL
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("stripe_session_id");
    if (!sessionId) return;
    window.history.replaceState({}, "", window.location.pathname);
    fetch(`/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(json => {
        if (json.ok) {
          stripeVerified.current = true;
          setIsUnlocked(true);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStripeCheckout() {
    if (!currentChapter) return;
    setUnlocking(true);
    setUnlockError(null);
    const base = window.location.pathname;
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapterId: currentChapter.id,
        successUrl: `${window.location.origin}${base}?stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}${base}`,
      }),
    });
    const json = await res.json();
    if (res.ok && json.url) {
      window.location.href = json.url;
    } else {
      setUnlockError("unlock_error");
      setUnlocking(false);
    }
  }

  const homeHref = `/${locale}/reader`;
  const basePath = `/${locale}/reader/series/${seriesId}`;
  const prevHref = prevChapter ? `${basePath}/${prevChapter.chapter_number}` : null;
  const nextHref = nextChapter ? `${basePath}/${nextChapter.chapter_number}` : null;

  if (status === "loading") {
    return (
      <main className="min-h-screen theme-soft">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="order-last space-y-4 lg:order-first">
              <div className="skeleton rounded-[28px]" style={{ aspectRatio: "2/3" }} />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 rounded-[12px]" style={{ animationDelay: `${i * 50}ms` }} />
                ))}
              </div>
            </aside>
            <div className="space-y-4 pt-2">
              <div className="skeleton h-7 rounded-lg" style={{ width: "60%" }} />
              <div className="skeleton h-4 rounded-md" style={{ width: "35%" }} />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton h-4 rounded-md"
                    style={{ width: `${75 + (i % 3) * 8}%`, animationDelay: `${i * 30}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (status === "error" || !seriesBase || !currentChapter) {
    return (
      <main className="min-h-screen theme-soft">
        <div className="mx-auto max-w-6xl space-y-4 px-6 py-12">
          <Link
            href={homeHref}
            className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-medium transition"
            style={{
              borderColor: "var(--border)",
              background: "rgba(233,230,223,0.72)",
              color: "var(--text)",
            }}
          >
            {t.backToReader}
          </Link>

          <div
            className="rounded-[24px] border p-5"
            style={{
              borderColor: "rgba(122,46,46,0.2)",
              background: "rgba(233,230,223,0.72)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {message || t.notFound}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const seriesTitle = seriesTr?.title || seriesBase.title || t.untitledSeries;
  const seriesDesc = seriesTr?.description || seriesBase.description || null;
  const coverSrc = seriesBase.cover_url || seriesBase.cover_image_url || "";

  const chapterTitle =
    currentChapterTranslation?.title ||
    currentChapter.title ||
    `${t.chapter} ${currentChapter.chapter_number}`;

  const chapterText =
    (currentChapterTranslation?.script && currentChapterTranslation.script.trim()) ||
    (currentChapter.content && currentChapter.content.trim()) ||
    "";

  return (
    <main className="min-h-screen theme-soft">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="order-last space-y-5 lg:order-first">
            <div
              className="rounded-[28px] border p-4"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.78)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div
                className="relative overflow-hidden rounded-[22px] border"
                style={{
                  aspectRatio: "2 / 3",
                  borderColor: "rgba(47,47,47,0.12)",
                  background:
                    "linear-gradient(145deg, rgba(94,99,87,0.18), rgba(217,212,204,0.8))",
                }}
              >
                {coverSrc ? (
                  <>
                    <img
                      src={coverSrc}
                      alt={seriesTitle}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-white/10" />
                    <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/30 to-transparent" />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(94,99,87,0.24),rgba(217,212,204,0.9))]" />
                    <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/35 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                      <div className="space-y-3">
                        <div
                          className="text-[10px] uppercase tracking-[0.28em]"
                          style={{ color: "var(--muted)" }}
                        >
                          Enkhverse
                        </div>
                        <div
                          className="text-lg font-bold leading-tight"
                          style={{ color: "var(--text)" }}
                        >
                          {seriesTitle}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={homeHref}
                    className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-medium transition"
                    style={{
                      borderColor: "var(--border)",
                      background: "rgba(255,255,255,0.55)",
                      color: "var(--text)",
                    }}
                  >
                    ← {t.backToReader}
                  </Link>

                  <span
                    className="rounded-full border px-3 py-1 text-[11px]"
                    style={{
                      borderColor: "var(--border)",
                      background: "rgba(255,255,255,0.5)",
                      color: "var(--muted)",
                    }}
                  >
                    {views.toLocaleString()} {t.views}
                  </span>
                </div>

                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  {t.chip}
                </p>
              </div>
            </div>

            <div
              className="rounded-[24px] border p-4"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.72)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {seriesTitle}
              </h2>

              {seriesDesc && (
                <p
                  className="mb-4 line-clamp-3 text-[12px]"
                  style={{ color: "var(--muted)" }}
                >
                  {seriesDesc}
                </p>
              )}

              <div className="space-y-2">
                {chapters.map((ch) => {
                  const tr = chapterTranslations.get(ch.id);
                  const itemTitle = tr?.title || ch.title || `${t.chapter} ${ch.chapter_number}`;
                  const href = `${basePath}/${ch.chapter_number}`;
                  const active = ch.chapter_number === chapterNumber;

                  return (
                    <Link
                      key={ch.id}
                      href={href}
                      className="block rounded-2xl border px-3 py-2 text-sm transition"
                      style={{
                        borderColor: active ? "rgba(94,99,87,0.32)" : "var(--border)",
                        background: active ? "rgba(94,99,87,0.12)" : "rgba(255,255,255,0.48)",
                        color: "var(--text)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          {t.chapter} {ch.chapter_number}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="truncate text-[11px]" style={{ color: "var(--muted)" }}>{itemTitle}</span>
                          {Number(ch.price ?? 0) > 0 && (
                            <span className="text-[10px] rounded-full px-1.5 py-0.5 font-semibold" style={{ background: "rgba(10,10,12,0.08)", color: "var(--muted)", border: "1px solid rgba(47,47,47,0.12)" }}>
                              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(ch.price))}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <header
              className="rounded-[28px] border p-6"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.82)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div className="space-y-2">
                <span
                  className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium"
                  style={{
                    borderColor: "var(--border)",
                    background: "rgba(255,255,255,0.52)",
                    color: "var(--muted)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  {t.chip}
                </span>

                <h1
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: "var(--text)" }}
                >
                  {seriesTitle}
                </h1>

                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {t.chapter} {currentChapter.chapter_number}
                  {chapterTitle ? ` · ${chapterTitle}` : ""}
                </p>

                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  {t.createdAt}:{" "}
                  {new Date(currentChapter.created_at).toLocaleString(localeForDate, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </header>

            {chapterPages.length > 0 ? (
              /* ── Manga / vertical scroll reader ── */
              <div className="flex flex-col items-center gap-0">
                {chapterPages.map((page, i) => (
                  <img
                    key={page.id}
                    src={page.image_url}
                    alt={`Page ${i + 1}`}
                    className="w-full max-w-2xl"
                    style={{ display: "block", margin: "0 auto" }}
                    loading={i < 3 ? "eager" : "lazy"}
                  />
                ))}
              </div>
            ) : (
              /* ── Prose reader ── */
              <article
                className="rounded-[30px] border p-8 md:p-12"
                style={{
                  borderColor: "var(--border)",
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(233,230,223,0.92))",
                  boxShadow: "0 24px 70px rgba(0,0,0,0.12)",
                }}
              >
                {isPaidChapter && !isUnlocked ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid rgba(47,47,47,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)", marginBottom: 8 }}>{t.locked}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(chapterPrice)}
                      </p>
                    </div>
                    {unlockError && (
                      <p className="text-xs" style={{ color: "#c85252" }}>
                        {unlockError === "insufficient_balance" ? t.insufficientBalance : unlockError === "already_unlocked" ? t.unlocked : t.unlockError}
                      </p>
                    )}
                    {!userId ? (
                      <Link href={`/${locale}/login`} className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold transition" style={{ borderColor: "rgba(47,47,47,0.18)", background: "rgba(10,10,12,0.08)", color: "var(--text)" }}>
                        {t.loginToUnlock}
                      </Link>
                    ) : (
                      <button
                        onClick={handleStripeCheckout}
                        disabled={unlocking}
                        className="inline-flex items-center rounded-full border px-6 py-2.5 text-xs font-semibold transition"
                        style={{ borderColor: "rgba(47,47,47,0.18)", background: "rgba(10,10,12,0.88)", color: "#eceae4", cursor: unlocking ? "not-allowed" : "pointer", opacity: unlocking ? 0.7 : 1 }}
                      >
                        {unlocking ? t.unlocking : `${t.unlock} ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(chapterPrice)}`}
                      </button>
                    )}
                  </div>
                ) : chapterText ? (
                  <div className="mx-auto max-w-3xl">
                    <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-8" style={{ color: "var(--text)" }}>
                      {chapterText}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{t.noContent}</p>
                )}
              </article>
            )}

            <div className="flex items-center justify-between gap-3">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-medium transition"
                  style={{
                    borderColor: "var(--border)",
                    background: "rgba(255,255,255,0.55)",
                    color: "var(--text)",
                  }}
                >
                  {t.prev}
                </Link>
              ) : (
                <span
                  className="inline-flex cursor-not-allowed items-center rounded-full border px-5 py-2.5 text-xs font-medium"
                  style={{
                    borderColor: "rgba(47,47,47,0.08)",
                    background: "rgba(255,255,255,0.28)",
                    color: "rgba(107,111,102,0.65)",
                  }}
                >
                  {t.prev}
                </span>
              )}

              {nextHref ? (
                <Link
                  href={nextHref}
                  className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold transition"
                  style={{
                    borderColor: "rgba(94,99,87,0.28)",
                    background: "rgba(94,99,87,0.14)",
                    color: "var(--text)",
                  }}
                >
                  {t.next}
                </Link>
              ) : (
                <span
                  className="inline-flex cursor-not-allowed items-center rounded-full border px-5 py-2.5 text-xs font-semibold"
                  style={{
                    borderColor: "rgba(47,47,47,0.08)",
                    background: "rgba(255,255,255,0.28)",
                    color: "rgba(107,111,102,0.65)",
                  }}
                >
                  {t.next}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}