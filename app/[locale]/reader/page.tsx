"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { safeLocale } from "@/lib/i18n"; // ✅ shared locale helper

type Status = "loading" | "ok" | "error";
type BookStatus = "draft" | "published";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  status: BookStatus;
  created_at: string;
};

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_image_url: string | null;
  language: string | null;
  published?: boolean | null;
  published_at?: string | null;
};

type TranslationRow = {
  content_type: "series" | "book" | "chapter";
  content_id: string;
  locale: "en" | "mn" | "ko" | "ja";
  title: string | null;
  description: string | null;
  body: string | null;
};

const UI_TEXT = {
  en: {
    chip: "Reader",
    heroTitle: "Read published content",
    heroBody: "Pick a published project or book and start from Chapter 1.",
    supabaseOk: "Loaded published content from Supabase.",
    supabaseEmpty: "No published content yet.",
    supabaseError: "Could not load reader content.",
    publishedProjects: "Published projects",
    publishedBooks: "Published books",
    startReading: "Start reading",
    createdAt: "Created",
    publishedAt: "Published",
    howItWorksTitle: "How it works",
    howItWorksBody:
      "Projects go to /reader/series/[seriesId]/1 and books go to /reader/[bookId]/1.",
    studio: "Studio",
    publisherBooks: "Publisher Books",
  },
  mn: {
    chip: "Уншигч",
    heroTitle: "Нийтлэгдсэн контент унших",
    heroBody: "Нийтлэгдсэн төсөл эсвэл ном сонгоод 1-р бүлгээс эхлээрэй.",
    supabaseOk: "Supabase-ээс нийтлэгдсэн контентыг уншлаа.",
    supabaseEmpty: "Одоогоор нийтлэгдсэн контент алга.",
    supabaseError: "Уншигч контент ачаалах боломжгүй.",
    publishedProjects: "Нийтлэгдсэн төслүүд",
    publishedBooks: "Нийтлэгдсэн номууд",
    startReading: "Уншиж эхлэх",
    createdAt: "Үүсгэсэн",
    publishedAt: "Нийтэлсэн",
    howItWorksTitle: "Яаж ажилладаг вэ",
    howItWorksBody: "Төсөл: /reader/series/[seriesId]/1, Ном: /reader/[bookId]/1",
    studio: "Студи",
    publisherBooks: "Нийтлэгч номууд",
  },
  ko: {
    chip: "리더",
    heroTitle: "게시된 콘텐츠 읽기",
    heroBody: "게시된 프로젝트 또는 책을 선택하고 1장부터 시작하세요.",
    supabaseOk: "Supabase에서 게시된 콘텐츠를 불러왔습니다.",
    supabaseEmpty: "게시된 콘텐츠가 없습니다.",
    supabaseError: "리더 콘텐츠를 불러올 수 없습니다.",
    publishedProjects: "게시된 프로젝트",
    publishedBooks: "게시된 책",
    startReading: "읽기 시작",
    createdAt: "생성일",
    publishedAt: "게시일",
    howItWorksTitle: "작동 방식",
    howItWorksBody: "프로젝트: /reader/series/[seriesId]/1, 책: /reader/[bookId]/1",
    studio: "스튜디오",
    publisherBooks: "퍼블리셔 책",
  },
  ja: {
    chip: "リーダー",
    heroTitle: "公開されたコンテンツを読む",
    heroBody:
      "公開されたプロジェクトまたは本を選んで、第1章から始めましょう。",
    supabaseOk: "Supabase から公開コンテンツを読み込みました。",
    supabaseEmpty: "公開されたコンテンツがありません。",
    supabaseError: "リーダーコンテンツを読み込めません。",
    publishedProjects: "公開プロジェクト",
    publishedBooks: "公開された本",
    startReading: "読み始める",
    createdAt: "作成日",
    publishedAt: "公開日",
    howItWorksTitle: "使い方",
    howItWorksBody:
      "プロジェクト: /reader/series/[seriesId]/1、 本: /reader/[bookId]/1",
    studio: "スタジオ",
    publisherBooks: "出版社の本",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

export default function ReaderHomePage() {
  const params = useParams();

  // ✅ single source of truth for locale parsing
  const locale = safeLocale(params?.locale) as SupportedLocale;
  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");

  // ✅ MUST be declared before useMemo uses them
  const [books, setBooks] = useState<BookRow[]>([]);
  const [series, setSeries] = useState<SeriesRow[]>([]);

  // ✅ derived message (no setState needed)
  const statusMessage = useMemo(() => {
    if (status === "loading") return "";
    if (status === "error") return t.supabaseError;
    if (books.length === 0 && series.length === 0) return t.supabaseEmpty;
    return t.supabaseOk;
  }, [status, books.length, series.length, t]);

  useEffect(() => {
    const load = async () => {
      setStatus("loading");

      const [booksRes, seriesRes] = await Promise.all([
        supabase
          .from("books")
          .select("id, title, description, status, created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false }),

        supabase
          .from("series")
          .select(
            "id, title, description, created_at, cover_image_url, language, published, published_at"
          )
          .or("published.eq.true,published_at.not.is.null")
          .order("published_at", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (booksRes.error || seriesRes.error) {
        console.error("Reader load error:", booksRes.error || seriesRes.error);
        setStatus("error");
        setBooks([]);
        setSeries([]);
        return;
      }

      const booksData = (booksRes.data as BookRow[]) || [];
      const seriesData = (seriesRes.data as SeriesRow[]) || [];

      // --- Translation layer (titles/descriptions) ---
      const bookIds = booksData.map((b) => b.id);
      const seriesIds = seriesData.map((s) => s.id);

      let translatedBooks = booksData;
      let translatedSeries = seriesData;

      try {
        const [bookTrRes, seriesTrRes] = await Promise.all([
          bookIds.length > 0
            ? (async () =>
                await supabase
                  .from("content_translations")
                  .select(
                    "content_type, content_id, locale, title, description, body"
                  )
                  .eq("content_type", "book")
                  .eq("locale", locale)
                  .in("content_id", bookIds))()
            : Promise.resolve({ data: [], error: null }),

          seriesIds.length > 0
            ? (async () =>
                await supabase
                  .from("content_translations")
                  .select(
                    "content_type, content_id, locale, title, description, body"
                  )
                  .eq("content_type", "series")
                  .eq("locale", locale)
                  .in("content_id", seriesIds))()
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (!bookTrRes?.error) {
          const rows = ((bookTrRes.data as TranslationRow[]) || []).filter(
            (r) => r && r.content_id
          );
          const map = new Map<string, TranslationRow>();
          for (const r of rows) map.set(r.content_id, r);

          translatedBooks = booksData.map((b) => {
            const tr = map.get(b.id);
            return {
              ...b,
              title: (tr?.title?.trim() ? tr.title : b.title) as string,
              description: tr?.description?.trim()
                ? tr.description
                : b.description,
            };
          });
        } else {
          console.warn("Book translations not loaded:", bookTrRes.error);
        }

        if (!seriesTrRes?.error) {
          const rows = ((seriesTrRes.data as TranslationRow[]) || []).filter(
            (r) => r && r.content_id
          );
          const map = new Map<string, TranslationRow>();
          for (const r of rows) map.set(r.content_id, r);

          translatedSeries = seriesData.map((s) => {
            const tr = map.get(s.id);
            return {
              ...s,
              title: (tr?.title?.trim() ? tr.title : s.title) as string,
              description: tr?.description?.trim()
                ? tr.description
                : s.description,
            };
          });
        } else {
          console.warn("Series translations not loaded:", seriesTrRes.error);
        }
      } catch (e) {
        console.warn("Translation lookup skipped (fallback to originals).", e);
      }

      setBooks(translatedBooks);
      setSeries(translatedSeries);
      setStatus("ok");
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t.chip}
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.heroTitle}
            </h1>
            <p className="max-w-xl text-sm text-slate-300">{t.heroBody}</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/${locale}/studio`}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-700 bg-black/40 px-4 py-2 text-xs font-medium text-slate-200 hover:border-emerald-400 hover:text-emerald-200 sm:mt-0"
            >
              {t.studio}
            </Link>
            <Link
              href={`/${locale}/publisher/books`}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-700 bg-black/40 px-4 py-2 text-xs font-medium text-slate-200 hover:border-emerald-400 hover:text-emerald-200 sm:mt-0"
            >
              {t.publisherBooks}
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
            <p className="mb-1 font-semibold">Supabase</p>
            {status === "loading" && <p>Loading…</p>}
            {status === "ok" && <p>{statusMessage}</p>}
            {status === "error" && (
              <p className="text-rose-300">{statusMessage}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300 md:col-span-2">
            <p className="mb-1 font-semibold">{t.howItWorksTitle}</p>
            <p>{t.howItWorksBody}</p>
          </div>
        </section>

        {/* PUBLISHED PROJECTS */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-100">
            {t.publishedProjects}
          </h2>

          {status !== "loading" && series.length === 0 && (
            <p className="text-xs text-slate-400">{t.supabaseEmpty}</p>
          )}

          {series.length > 0 && (
            <ul className="flex flex-col gap-3">
              {series.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-slate-800 bg-black/40 p-4 transition hover:border-emerald-400/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-50">
                          {s.title}
                        </h3>
                        {s.language && (
                          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                            {s.language.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {s.description && (
                        <p className="line-clamp-2 text-xs text-slate-300">
                          {s.description}
                        </p>
                      )}

                      <p className="text-[10px] text-slate-500">
                        {t.publishedAt}:{" "}
                        {s.published_at ? formatDate(s.published_at) : "—"} ·{" "}
                        {t.createdAt}: {formatDate(s.created_at)}
                      </p>
                    </div>

                    <Link
                      href={`/${locale}/reader/series/${s.id}/1`}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-black hover:bg-emerald-500"
                    >
                      {t.startReading}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* PUBLISHED BOOKS */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-100">
            {t.publishedBooks}
          </h2>

          {status !== "loading" && books.length === 0 && (
            <p className="text-xs text-slate-400">{t.supabaseEmpty}</p>
          )}

          {books.length > 0 && (
            <ul className="flex flex-col gap-3">
              {books.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-slate-800 bg-black/40 p-4 transition hover:border-indigo-400/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-50">
                        {b.title}
                      </h3>

                      {b.description && (
                        <p className="line-clamp-2 text-xs text-slate-300">
                          {b.description}
                        </p>
                      )}

                      <p className="text-[10px] text-slate-500">
                        {t.createdAt}: {formatDate(b.created_at)}
                      </p>
                    </div>

                    <Link
                      href={`/${locale}/reader/${b.id}/1`}
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
                    >
                      {t.startReading}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
