"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { safeLocale } from "@/lib/i18n";

type Status = "loading" | "ok" | "error";
type BookStatus = "draft" | "published";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  status: BookStatus;
  created_at: string;
  cover_url?: string | null;
  views?: number | null;
  page_count?: number | null;
};

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_url?: string | null;
  cover_image_url?: string | null;
  language: string | null;
  published?: boolean | null;
  published_at?: string | null;
  views?: number | null;
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
    views: "views",
    noCover: "No cover",
    howItWorksTitle: "How it works",
    howItWorksBody:
      "Projects go to /reader/series/[seriesId]/1 and books go to /reader/[bookId]/1.",
    backHome: "Back to home",
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
    views: "үзэлт",
    noCover: "Ковергүй",
    howItWorksTitle: "Яаж ажилладаг вэ",
    howItWorksBody: "Төсөл: /reader/series/[seriesId]/1, Ном: /reader/[bookId]/1",
    backHome: "Нүүр рүү буцах",
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
    views: "조회수",
    noCover: "표지 없음",
    howItWorksTitle: "작동 방식",
    howItWorksBody: "프로젝트: /reader/series/[seriesId]/1, 책: /reader/[bookId]/1",
    backHome: "홈으로",
  },
  ja: {
    chip: "リーダー",
    heroTitle: "公開されたコンテンツを読む",
    heroBody: "公開されたプロジェクトまたは本を選んで、第1章から始めましょう。",
    supabaseOk: "Supabase から公開コンテンツを読み込みました。",
    supabaseEmpty: "公開されたコンテンツがありません。",
    supabaseError: "リーダーコンテンツを読み込めません。",
    publishedProjects: "公開プロジェクト",
    publishedBooks: "公開された本",
    startReading: "読み始める",
    createdAt: "作成日",
    publishedAt: "公開日",
    views: "閲覧",
    noCover: "表紙なし",
    howItWorksTitle: "使い方",
    howItWorksBody:
      "プロジェクト: /reader/series/[seriesId]/1、 本: /reader/[bookId]/1",
    backHome: "ホームへ戻る",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

export default function ReaderHomePage() {
  const params = useParams();
  const locale = safeLocale(params?.locale) as SupportedLocale;
  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [books, setBooks] = useState<BookRow[]>([]);
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [activeGlow, setActiveGlow] = useState<string>("rgba(99,102,241,0.10)");

  const statusMessage = useMemo(() => {
    if (status === "loading") return "";
    if (status === "error") return t.supabaseError;
    if (books.length === 0 && series.length === 0) return t.supabaseEmpty;
    return t.supabaseOk;
  }, [status, books.length, series.length, t]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");

      const [booksRes, seriesRes] = await Promise.all([
        supabase
          .from("books")
          .select(
            "id, title, description, status, created_at, cover_url, views, page_count"
          )
          .eq("status", "published")
          .order("views", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("series")
          .select(
            "id, title, description, created_at, cover_url, cover_image_url, language, published, published_at, views"
          )
          .or("published.eq.true,published_at.not.is.null")
          .order("views", { ascending: false })
          .order("published_at", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (booksRes.error || seriesRes.error) {
        console.error("Reader load error:", booksRes.error || seriesRes.error);
        if (!cancelled) {
          setStatus("error");
          setBooks([]);
          setSeries([]);
        }
        return;
      }

      const booksData = (booksRes.data as BookRow[]) || [];
      const seriesData = (seriesRes.data as SeriesRow[]) || [];

      const bookIds = booksData.map((b) => b.id);
      const seriesIds = seriesData.map((s) => s.id);

      let translatedBooks = booksData;
      let translatedSeries = seriesData;

      try {
        const [bookTrRes, seriesTrRes] = await Promise.all([
          bookIds.length > 0
            ? supabase
                .from("content_translations")
                .select("content_type, content_id, locale, title, description, body")
                .eq("content_type", "book")
                .eq("locale", locale)
                .in("content_id", bookIds)
            : Promise.resolve({ data: [], error: null }),

          seriesIds.length > 0
            ? supabase
                .from("content_translations")
                .select("content_type, content_id, locale, title, description, body")
                .eq("content_type", "series")
                .eq("locale", locale)
                .in("content_id", seriesIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (!bookTrRes.error) {
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
        }

        if (!seriesTrRes.error) {
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
        }
      } catch (e) {
        console.warn("Translation lookup skipped.", e);
      }

      if (!cancelled) {
        setBooks(translatedBooks);
        setSeries(translatedSeries);
        setStatus("ok");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const getSeriesCover = (item: SeriesRow) => item.cover_url || item.cover_image_url;

  const setProjectGlow = () => setActiveGlow("rgba(16,185,129,0.12)");
  const setBookGlow = () => setActiveGlow("rgba(99,102,241,0.12)");
  const resetGlow = () => setActiveGlow("rgba(99,102,241,0.10)");

  return (
    <main
      className="min-h-screen text-slate-100 transition-all duration-500"
      style={{
        background: `radial-gradient(circle at top center, ${activeGlow}, rgba(2,6,23,0) 34%), linear-gradient(to bottom, #020617, #020617 18%, #020617 100%)`,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300 transition-all duration-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t.chip}
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.heroTitle}
            </h1>
            <p className="max-w-xl text-sm text-slate-300">{t.heroBody}</p>
          </div>

          <Link
            href={`/${locale}`}
            className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-700 bg-black/40 px-4 py-2 text-xs font-medium text-slate-200 transition-all duration-300 hover:border-emerald-400 hover:text-emerald-200 sm:mt-0"
          >
            ← {t.backHome}
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300 backdrop-blur">
            <p className="mb-1 font-semibold">Supabase</p>
            {status === "loading" && <p>Loading…</p>}
            {status === "ok" && <p>{statusMessage}</p>}
            {status === "error" && <p className="text-rose-300">{statusMessage}</p>}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300 backdrop-blur md:col-span-2">
            <p className="mb-1 font-semibold">{t.howItWorksTitle}</p>
            <p>{t.howItWorksBody}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            {t.publishedProjects}
          </h2>

          {status !== "loading" && series.length === 0 && (
            <p className="text-xs text-slate-400">{t.supabaseEmpty}</p>
          )}

          {series.length > 0 && (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
              {series.map((s) => {
                const coverSrc = getSeriesCover(s);

                return (
                  <article
                    key={s.id}
                    onMouseEnter={setProjectGlow}
                    onMouseLeave={resetGlow}
                    className="group"
                  >
                    <Link href={`/${locale}/reader/series/${s.id}/1`} className="block">
                      <div
                        className="relative overflow-hidden rounded-[22px] border border-slate-800 bg-slate-900/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-[0.4deg] group-hover:border-emerald-400/60 group-hover:shadow-[0_24px_55px_rgba(16,185,129,0.16)]"
                        style={{ aspectRatio: "2 / 3" }}
                      >
                        {coverSrc ? (
                          <>
                            <img
                              src={coverSrc}
                              alt={s.title || ""}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-white/10" />
                            <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/10 to-transparent" />
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950" />
                            <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/10 to-transparent" />
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/10" />
                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                              <div className="space-y-3">
                                <div className="text-[10px] uppercase tracking-[0.28em] text-slate-300/70">
                                  Enkhverse
                                </div>
                                <div className="text-lg font-bold leading-tight text-white">
                                  {s.title}
                                </div>
                                <div className="text-[11px] text-slate-300/80">
                                  {t.noCover}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="line-clamp-2 text-sm font-semibold text-white">
                                {s.title}
                              </h3>
                              {s.language && (
                                <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-slate-200 backdrop-blur">
                                  {s.language.toUpperCase()}
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <p className="line-clamp-2 text-[11px] text-slate-200/90">
                                {s.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] text-slate-500">
                          {t.publishedAt}: {s.published_at ? formatDate(s.published_at) : "—"}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500">
                            {(s.views ?? 0).toLocaleString()} {t.views}
                          </span>
                          <span className="inline-flex items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 transition-all duration-300 group-hover:border-emerald-300/60 group-hover:bg-emerald-400/15">
                            {t.startReading}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            {t.publishedBooks}
          </h2>

          {status !== "loading" && books.length === 0 && (
            <p className="text-xs text-slate-400">{t.supabaseEmpty}</p>
          )}

          {books.length > 0 && (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
              {books.map((b) => (
                <article
                  key={b.id}
                  onMouseEnter={setBookGlow}
                  onMouseLeave={resetGlow}
                  className="group"
                >
                  <Link href={`/${locale}/reader/${b.id}/1`} className="block">
                    <div
                      className="relative overflow-hidden rounded-[22px] border border-slate-800 bg-slate-900/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition-all duration-500 group-hover:-translate-y-1 group-hover:-rotate-[0.4deg] group-hover:border-indigo-400/60 group-hover:shadow-[0_24px_55px_rgba(99,102,241,0.18)]"
                      style={{ aspectRatio: "2 / 3" }}
                    >
                      {b.cover_url ? (
                        <>
                          <img
                            src={b.cover_url}
                            alt={b.title || ""}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/15 to-white/10" />
                          <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/10 to-transparent" />
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-slate-900 to-slate-950" />
                          <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/10 to-transparent" />
                          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/10" />
                          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                            <div className="space-y-3">
                              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-300/70">
                                Enkhverse
                              </div>
                              <div className="text-lg font-bold leading-tight text-white">
                                {b.title}
                              </div>
                              <div className="text-[11px] text-slate-300/80">
                                {t.noCover}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <div className="space-y-1">
                          <h3 className="line-clamp-2 text-sm font-semibold text-white">
                            {b.title}
                          </h3>
                          {b.description && (
                            <p className="line-clamp-2 text-[11px] text-slate-200/90">
                              {b.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] text-slate-500">
                        {t.createdAt}: {formatDate(b.created_at)}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500">
                          {(b.views ?? 0).toLocaleString()} {t.views}
                        </span>
                        <span className="inline-flex items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-[11px] font-semibold text-indigo-100 transition-all duration-300 group-hover:border-indigo-300/60 group-hover:bg-indigo-400/15">
                          {t.startReading}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}