"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";
type ContentType = "book" | "series";
type Locale = "en" | "mn" | "ko" | "ja";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  created_at: string;
  cover_url?: string | null;
  views?: number | null;
};

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  created_at: string;
  language: string | null;
  cover_url?: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
  views?: number | null;
};

type ChapterRow = {
  id: string;
  title: string;
  chapter_number: number | null;
  created_at: string;
  content: string | null;
  book_id?: string | null;
  series_id?: string | null;
};

type TranslationRow = {
  content_type: "series" | "book" | "chapter";
  content_id: string;
  locale: Locale;
  title: string | null;
  description: string | null;
  body: string | null;
};

const UI_TEXT = {
  en: {
    back: "← Back",
    reader: "Reader",
    loading: "Loading…",
    notFound: "Not found.",
    loadError: "Could not load.",
    chapter: "Chapter",
    createdAt: "Created",
    prev: "Prev",
    next: "Next",
    goHome: "Go to Reader home",
    noContent: "No content for this chapter.",
    views: "views",
  },
  mn: {
    back: "← Буцах",
    reader: "Уншигч",
    loading: "Ачаалж байна…",
    notFound: "Олдсонгүй.",
    loadError: "Ачаалж чадсангүй.",
    chapter: "Бүлэг",
    createdAt: "Үүсгэсэн",
    prev: "Өмнөх",
    next: "Дараах",
    goHome: "Уншигчийн нүүр рүү",
    noContent: "Энэ бүлэгт контент алга.",
    views: "үзэлт",
  },
  ko: {
    back: "← 뒤로",
    reader: "리더",
    loading: "불러오는 중…",
    notFound: "찾을 수 없습니다.",
    loadError: "불러오지 못했습니다.",
    chapter: "챕터",
    createdAt: "생성일",
    prev: "이전",
    next: "다음",
    goHome: "리더 홈으로",
    noContent: "이 챕터에 내용이 없습니다.",
    views: "조회수",
  },
  ja: {
    back: "← 戻る",
    reader: "リーダー",
    loading: "読み込み中…",
    notFound: "見つかりません。",
    loadError: "読み込めませんでした。",
    chapter: "チャプター",
    createdAt: "作成日",
    prev: "前へ",
    next: "次へ",
    goHome: "リーダーホームへ",
    noContent: "このチャプターには内容がありません。",
    views: "閲覧",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

function safeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

export default function ReaderChapterPage() {
  const params = useParams();

  const locale = safeLocale((params?.locale as string) || "en");
  const t = UI_TEXT[locale];

  const contentId = (params?.bookId as string) || "";
  const chapterParam = (params?.chapterNumber as string) || "1";
  const chapterNumber = Number(chapterParam) || 1;

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [title, setTitle] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [views, setViews] = useState<number>(0);

  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [displayTitle, setDisplayTitle] = useState<string>("");
  const [displayChapters, setDisplayChapters] = useState<ChapterRow[]>([]);

  const currentChapter = useMemo(() => {
    return (
      displayChapters.find((c) => (c.chapter_number ?? 0) === chapterNumber) || null
    );
  }, [displayChapters, chapterNumber]);

  const currentChapterIndex = useMemo(() => {
    return displayChapters.findIndex((c) => (c.chapter_number ?? 0) === chapterNumber);
  }, [displayChapters, chapterNumber]);

  const prevChapter = currentChapterIndex > 0 ? displayChapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < displayChapters.length - 1
      ? displayChapters[currentChapterIndex + 1]
      : null;

  const contentText = useMemo(() => {
    const text = currentChapter?.content ?? "";
    return text.trim();
  }, [currentChapter?.content]);

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      setError(null);
      setContentType(null);
      setTitle("");
      setCoverUrl("");
      setViews(0);
      setDisplayTitle("");
      setChapters([]);
      setDisplayChapters([]);

      if (!contentId) {
        setStatus("error");
        setError("Missing content id.");
        return;
      }

      const incrementView = async (type: ContentType) => {
        try {
          if (type === "book") {
            await supabase.rpc("increment_book_views", { target_id: contentId });
          } else {
            await supabase.rpc("increment_series_views", { target_id: contentId });
          }
        } catch {
          try {
            if (type === "book") {
              const { data } = await supabase
                .from("books")
                .select("views")
                .eq("id", contentId)
                .maybeSingle();

              const current = Number((data as { views?: number | null } | null)?.views ?? 0);

              await supabase.from("books").update({ views: current + 1 }).eq("id", contentId);
            } else {
              const { data } = await supabase
                .from("series")
                .select("views")
                .eq("id", contentId)
                .maybeSingle();

              const current = Number((data as { views?: number | null } | null)?.views ?? 0);

              await supabase.from("series").update({ views: current + 1 }).eq("id", contentId);
            }
          } catch {
            // ignore view increment failure
          }
        }
      };

      const applyTranslations = async (args: {
        locale: Locale;
        contentType: ContentType;
        contentId: string;
        baseTitle: string;
        baseChapters: ChapterRow[];
      }) => {
        const { locale, contentType, contentId, baseTitle, baseChapters } = args;

        setDisplayTitle(baseTitle);
        setDisplayChapters(baseChapters);

        try {
          const contentTrRes = await supabase
            .from("content_translations")
            .select("content_type, content_id, locale, title, description, body")
            .eq("content_type", contentType)
            .eq("content_id", contentId)
            .eq("locale", locale)
            .maybeSingle();

          if (contentTrRes?.error) {
            console.warn("Content translation load error:", contentTrRes.error);
          }

          const contentTr = (contentTrRes?.data as TranslationRow | null) ?? null;
          const mergedTitle = contentTr?.title?.trim() ? contentTr.title : baseTitle;

          const chapterIds = baseChapters.map((c) => c.id);
          let mergedChapters = baseChapters;

          if (chapterIds.length > 0) {
            const chTrRes = await supabase
              .from("content_translations")
              .select("content_type, content_id, locale, title, description, body")
              .eq("content_type", "chapter")
              .eq("locale", locale)
              .in("content_id", chapterIds);

            if (chTrRes?.error) {
              console.warn("Chapter translations load error:", chTrRes.error);
            } else {
              const rows = ((chTrRes.data as TranslationRow[]) || []).filter(
                (r) => r && r.content_id
              );
              const map = new Map<string, TranslationRow>();
              for (const r of rows) map.set(r.content_id, r);

              mergedChapters = baseChapters.map((ch) => {
                const tr = map.get(ch.id);
                return {
                  ...ch,
                  title: tr?.title?.trim() ? tr.title : ch.title,
                  content: tr?.body?.trim() ? tr.body : ch.content,
                };
              });
            }
          }

          setDisplayTitle(mergedTitle);
          setDisplayChapters(mergedChapters);
        } catch (e) {
          console.warn("Translation lookup skipped (fallback).", e);
          setDisplayTitle(baseTitle);
          setDisplayChapters(baseChapters);
        }
      };

      const { data: book, error: bookErr } = await supabase
        .from("books")
        .select("id, title, description, status, created_at, cover_url, views")
        .eq("id", contentId)
        .maybeSingle();

      if (bookErr) {
        setStatus("error");
        setError(bookErr.message);
        return;
      }

      if (book && (book as BookRow).status === "published") {
        const bookRow = book as BookRow;

        setContentType("book");
        setTitle(bookRow.title);
        setDisplayTitle(bookRow.title);
        setCoverUrl(bookRow.cover_url || "");
        setViews(Number(bookRow.views ?? 0) + 1);

        await incrementView("book");

        const { data: bookCh, error: chErr } = await supabase
          .from("chapters")
          .select("id, title, chapter_number, created_at, content, book_id")
          .eq("book_id", contentId)
          .order("chapter_number", { ascending: true });

        if (chErr) {
          setStatus("error");
          setError(chErr.message);
          return;
        }

        const baseChapters = (bookCh as ChapterRow[]) || [];
        setChapters(baseChapters);

        await applyTranslations({
          locale: locale as Locale,
          contentType: "book",
          contentId,
          baseTitle: bookRow.title,
          baseChapters,
        });

        setStatus("ok");
        return;
      }

      const { data: series, error: seriesErr } = await supabase
        .from("series")
        .select(
          "id, title, description, published, created_at, language, cover_url, cover_image_url, published_at, views"
        )
        .eq("id", contentId)
        .maybeSingle();

      if (seriesErr) {
        setStatus("error");
        setError(seriesErr.message);
        return;
      }

      if (!series || !(series as SeriesRow).published) {
        setStatus("error");
        setError(t.notFound);
        return;
      }

      const seriesRow = series as SeriesRow;

      setContentType("series");
      setTitle(seriesRow.title);
      setDisplayTitle(seriesRow.title);
      setCoverUrl(seriesRow.cover_url || seriesRow.cover_image_url || "");
      setViews(Number(seriesRow.views ?? 0) + 1);

      await incrementView("series");

      const { data: seriesCh, error: sChErr } = await supabase
        .from("chapters")
        .select("id, title, chapter_number, created_at, content, series_id")
        .eq("series_id", contentId)
        .order("chapter_number", { ascending: true });

      if (sChErr) {
        setStatus("error");
        setError(sChErr.message);
        return;
      }

      const baseChapters = (seriesCh as ChapterRow[]) || [];
      setChapters(baseChapters);

      await applyTranslations({
        locale: locale as Locale,
        contentType: "series",
        contentId,
        baseTitle: seriesRow.title,
        baseChapters,
      });

      setStatus("ok");
    };

    load();
  }, [contentId, locale, t.notFound]);

  const basePath =
    contentType === "series"
      ? `/${locale}/reader/series/${contentId}`
      : `/${locale}/reader/${contentId}`;

  const prevHref = prevChapter ? `${basePath}/${prevChapter.chapter_number ?? 1}` : null;
  const nextHref = nextChapter ? `${basePath}/${nextChapter.chapter_number ?? 1}` : null;
  const homeHref = `/${locale}/reader`;

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[linear-gradient(to_bottom,#020617,#0f172a_35%,#111827)] text-stone-100">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm text-stone-300">{t.loading}</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-[linear-gradient(to_bottom,#020617,#0f172a_35%,#111827)] text-stone-100">
        <div className="mx-auto max-w-6xl space-y-4 px-6 py-12">
          <Link
            href={homeHref}
            className="inline-flex items-center rounded-full border border-stone-700/70 bg-black/20 px-4 py-2 text-xs text-stone-200 transition hover:border-stone-500"
          >
            {t.goHome}
          </Link>
          <p className="text-sm text-rose-300">
            {t.loadError} {error ? `(${error})` : ""}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_28%),linear-gradient(to_bottom,#020617,#0f172a_35%,#111827)] text-stone-100 transition-all duration-500">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-[28px] border border-slate-800 bg-slate-950/65 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur">
              <div
                className="relative overflow-hidden rounded-[22px] border border-slate-800 bg-slate-900/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
                style={{ aspectRatio: "2 / 3" }}
              >
                {coverUrl ? (
                  <>
                    <img
                      src={coverUrl}
                      alt={displayTitle || title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/20 to-white/10" />
                    <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/10 to-transparent" />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-slate-900 to-slate-950" />
                    <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                      <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-[0.28em] text-slate-300/70">
                          Enkhverse
                        </div>
                        <div className="text-lg font-bold leading-tight text-white">
                          {displayTitle || title}
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
                    className="inline-flex items-center rounded-full border border-slate-700 bg-black/20 px-4 py-2 text-xs text-slate-200 transition hover:border-slate-500"
                  >
                    {t.back}
                  </Link>

                  <span className="rounded-full border border-slate-700 bg-black/20 px-3 py-1 text-[11px] text-slate-300">
                    {views.toLocaleString()} {t.views}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {t.reader}
                  {contentType ? ` • ${contentType === "book" ? "Book" : "Project"}` : ""}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-800 bg-slate-950/55 p-4 backdrop-blur">
              <h2 className="mb-3 text-sm font-semibold text-white">
                {displayTitle || title}
              </h2>

              <div className="space-y-2">
                {displayChapters.map((ch) => {
                  const href = `${basePath}/${ch.chapter_number ?? 1}`;
                  const active = (ch.chapter_number ?? 0) === chapterNumber;

                  return (
                    <Link
                      key={ch.id}
                      href={href}
                      className={`block rounded-2xl border px-3 py-2 text-sm transition ${
                        active
                          ? "border-indigo-400/60 bg-indigo-500/12 text-white"
                          : "border-slate-800 bg-black/20 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          {t.chapter} {ch.chapter_number ?? "—"}
                        </span>
                        <span className="truncate text-[11px] opacity-80">
                          {ch.title || ""}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <header className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {displayTitle || title}
                </h1>

                <p className="text-sm text-slate-300">
                  {t.chapter} {chapterNumber}
                  {currentChapter?.title ? ` · ${currentChapter.title}` : ""}
                </p>

                {currentChapter?.created_at && (
                  <p className="text-[11px] text-slate-500">
                    {t.createdAt}:{" "}
                    {new Date(currentChapter.created_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            </header>

            <article className="rounded-[30px] border border-stone-300/10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-8 text-stone-900 shadow-[0_24px_70px_rgba(0,0,0,0.26)] md:p-12">
              {contentText ? (
                <div className="mx-auto max-w-3xl">
                  <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-8 text-stone-800">
                    {contentText}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-stone-500">{t.noContent}</p>
              )}
            </article>

            <div className="flex items-center justify-between gap-3">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="inline-flex items-center rounded-full border border-slate-700 bg-black/20 px-5 py-2.5 text-xs font-medium text-slate-200 transition hover:border-slate-500"
                >
                  {t.prev}
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-full border border-slate-800 bg-black/10 px-5 py-2.5 text-xs font-medium text-slate-500">
                  {t.prev}
                </span>
              )}

              {nextHref ? (
                <Link
                  href={nextHref}
                  className="inline-flex items-center rounded-full border border-indigo-400/40 bg-indigo-500/14 px-5 py-2.5 text-xs font-semibold text-indigo-100 transition hover:border-indigo-300/60 hover:bg-indigo-500/20"
                >
                  {t.next}
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-full border border-slate-800 bg-black/10 px-5 py-2.5 text-xs font-semibold text-slate-500">
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