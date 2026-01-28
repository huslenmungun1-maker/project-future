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
};

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  created_at: string;
  language: string | null;
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

  // keep your folder name [bookId] but treat it as contentId
  const contentId = (params?.bookId as string) || "";
  const chapterParam = (params?.chapterNumber as string) || "1";
  const chapterNumber = Number(chapterParam) || 1;

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [title, setTitle] = useState<string>("");

  // originals
  const [chapters, setChapters] = useState<ChapterRow[]>([]);

  // translated display (fallback to originals)
  const [displayTitle, setDisplayTitle] = useState<string>("");
  const [displayChapters, setDisplayChapters] = useState<ChapterRow[]>([]);

  const currentChapter = useMemo(() => {
    return (
      displayChapters.find((c) => (c.chapter_number ?? 0) === chapterNumber) ||
      null
    );
  }, [displayChapters, chapterNumber]);

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
      setDisplayTitle("");
      setChapters([]);
      setDisplayChapters([]);

      if (!contentId) {
        setStatus("error");
        setError("Missing content id.");
        return;
      }

      // 1) Try BOOK first
      const { data: book, error: bookErr } = await supabase
        .from("books")
        .select("id, title, description, status, created_at")
        .eq("id", contentId)
        .maybeSingle();

      if (bookErr) {
        setStatus("error");
        setError(bookErr.message);
        return;
      }

      if (book && (book as BookRow).status === "published") {
        setContentType("book");
        setTitle((book as BookRow).title);

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

        // ---- translations for BOOK + CHAPTERS ----
        await applyTranslations({
          locale: locale as Locale,
          contentType: "book",
          contentId,
          baseTitle: (book as BookRow).title,
          baseChapters,
        });

        setStatus("ok");
        return;
      }

      // 2) Else try SERIES (project)
      const { data: series, error: seriesErr } = await supabase
        .from("series")
        .select("id, title, description, published, created_at, language")
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

      setContentType("series");
      setTitle((series as SeriesRow).title);

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

      // ---- translations for SERIES + CHAPTERS ----
      await applyTranslations({
        locale: locale as Locale,
        contentType: "series",
        contentId,
        baseTitle: (series as SeriesRow).title,
        baseChapters,
      });

      setStatus("ok");
    };

    // helper inside effect to keep everything in one file
    const applyTranslations = async (args: {
      locale: Locale;
      contentType: ContentType;
      contentId: string;
      baseTitle: string;
      baseChapters: ChapterRow[];
    }) => {
      const { locale, contentType, contentId, baseTitle, baseChapters } = args;

      // default fallback
      setDisplayTitle(baseTitle);
      setDisplayChapters(baseChapters);

      // if user is on English, we can still allow fallback but keep it simple
      // (still supports EN translations if you store them)
      try {
        // content translation (book/series title)
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
        const mergedTitle =
          contentTr?.title?.trim() ? contentTr.title : baseTitle;

        // chapter translations
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
        // content_translations table missing => fallback
        console.warn("Translation lookup skipped (fallback).", e);
        setDisplayTitle(baseTitle);
        setDisplayChapters(baseChapters);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, locale]);

const basePath =
  contentType === "series"
    ? `/${locale}/reader/series/${contentId}`
    : `/${locale}/reader/${contentId}`;

const prevHref = `${basePath}/${Math.max(1, chapterNumber - 1)}`;
const nextHref = `${basePath}/${chapterNumber + 1}`;
const homeHref = `/${locale}/reader`;


  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-sm text-slate-300">{t.loading}</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-10 space-y-3">
          <Link
            href={homeHref}
            className="text-xs text-slate-300 hover:text-emerald-300"
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
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={homeHref}
            className="text-xs text-slate-300 hover:text-emerald-300"
          >
            {t.back}
          </Link>

          <span className="text-[11px] text-slate-400">
            {t.reader}
            {contentType ? ` • ${contentType === "book" ? "Book" : "Project"}` : ""}
          </span>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
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
        </header>

        <section className="rounded-2xl border border-slate-800 bg-black/30 p-5">
          {contentText ? (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
              {contentText}
            </pre>
          ) : (
            <p className="text-sm text-slate-400">{t.noContent}</p>
          )}
        </section>

        <div className="flex items-center justify-between">
          <Link
            href={prevHref}
            className="rounded-xl border border-slate-700 bg-black/30 px-4 py-2 text-xs text-slate-200 hover:border-slate-500"
          >
            {t.prev}
          </Link>

          <Link
            href={nextHref}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
          >
            {t.next}
          </Link>
        </div>
      </div>
    </main>
  );
}
