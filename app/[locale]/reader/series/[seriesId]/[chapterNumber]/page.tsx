"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  const chapterNumber = Number(String(params.chapter || "1")) || 1;

  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const [seriesBase, setSeriesBase] = useState<SeriesBaseRow | null>(null);
  const [seriesTr, setSeriesTr] = useState<SeriesTranslationRow | null>(null);

  const [chapters, setChapters] = useState<ChapterBaseRow[]>([]);
  const [chapterTranslations, setChapterTranslations] = useState<
    Map<string, ChapterTranslationRow>
  >(new Map());

  const [views, setViews] = useState<number>(0);

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

      if (!seriesId) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from("series")
        .select(
          "id, created_at, cover_url, cover_image_url, published, published_at, default_locale, title, description, views"
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
          "id, series_id, chapter_number, created_at, title, content, is_published, published_at"
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

      setStatus("ok");
    };

    load();
  }, [seriesId, chapterNumber, locale, t.notFound, t.supabaseError]);

  const homeHref = `/${locale}/reader`;
  const basePath = `/${locale}/reader/series/${seriesId}`;
  const prevHref = prevChapter ? `${basePath}/${prevChapter.chapter_number}` : null;
  const nextHref = nextChapter ? `${basePath}/${nextChapter.chapter_number}` : null;

  if (status === "loading") {
    return (
      <main className="min-h-screen theme-soft">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p style={{ color: "var(--muted)" }} className="text-sm">
            {t.loading}
          </p>
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
          <aside className="space-y-5">
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
                        <span
                          className="truncate text-[11px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {itemTitle}
                        </span>
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

            <article
              className="rounded-[30px] border p-8 md:p-12"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(233,230,223,0.92))",
                boxShadow: "0 24px 70px rgba(0,0,0,0.12)",
              }}
            >
              {chapterText ? (
                <div className="mx-auto max-w-3xl">
                  <pre
                    className="whitespace-pre-wrap break-words font-sans text-[15px] leading-8"
                    style={{ color: "var(--text)" }}
                  >
                    {chapterText}
                  </pre>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {t.noContent}
                </p>
              )}
            </article>

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