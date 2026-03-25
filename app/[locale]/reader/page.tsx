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
    heroBody: "Pick a published series or book and start from Chapter 1.",
    supabaseOk: "Loaded published content from Supabase.",
    supabaseEmpty: "No published content yet.",
    supabaseError: "Could not load reader content.",
    publishedProjects: "Published series",
    publishedBooks: "Published books",
    startReading: "Start reading",
    createdAt: "Created",
    publishedAt: "Published",
    views: "views",
    noCover: "No cover",
    backHome: "Back to home",
    untitledBook: "Untitled book",
    untitledSeries: "Untitled series",
  },
  mn: {
    chip: "Уншигч",
    heroTitle: "Нийтлэгдсэн контент унших",
    heroBody: "Нийтлэгдсэн цуврал эсвэл ном сонгоод 1-р бүлгээс эхлээрэй.",
    supabaseOk: "Supabase-ээс нийтлэгдсэн контентыг ачааллаа.",
    supabaseEmpty: "Одоогоор нийтлэгдсэн контент алга.",
    supabaseError: "Уншигчийн контентыг ачаалж чадсангүй.",
    publishedProjects: "Нийтлэгдсэн цувралууд",
    publishedBooks: "Нийтлэгдсэн номууд",
    startReading: "Уншиж эхлэх",
    createdAt: "Үүсгэсэн",
    publishedAt: "Нийтэлсэн",
    views: "үзэлт",
    noCover: "Ковергүй",
    backHome: "Нүүр рүү буцах",
    untitledBook: "Нэргүй ном",
    untitledSeries: "Нэргүй цуврал",
  },
  ko: {
    chip: "리더",
    heroTitle: "게시된 콘텐츠 읽기",
    heroBody: "게시된 시리즈 또는 책을 선택하고 1장부터 시작하세요.",
    supabaseOk: "Supabase에서 게시된 콘텐츠를 불러왔습니다.",
    supabaseEmpty: "게시된 콘텐츠가 없습니다.",
    supabaseError: "리더 콘텐츠를 불러올 수 없습니다.",
    publishedProjects: "게시된 시리즈",
    publishedBooks: "게시된 책",
    startReading: "읽기 시작",
    createdAt: "생성일",
    publishedAt: "게시일",
    views: "조회수",
    noCover: "표지 없음",
    backHome: "홈으로",
    untitledBook: "제목 없는 책",
    untitledSeries: "제목 없는 시리즈",
  },
  ja: {
    chip: "リーダー",
    heroTitle: "公開されたコンテンツを読む",
    heroBody: "公開されたシリーズまたは本を選んで、第1章から始めましょう。",
    supabaseOk: "Supabase から公開コンテンツを読み込みました。",
    supabaseEmpty: "公開されたコンテンツがありません。",
    supabaseError: "リーダーコンテンツを読み込めません。",
    publishedProjects: "公開シリーズ",
    publishedBooks: "公開された本",
    startReading: "読み始める",
    createdAt: "作成日",
    publishedAt: "公開日",
    views: "閲覧",
    noCover: "表紙なし",
    backHome: "ホームへ戻る",
    untitledBook: "無題の本",
    untitledSeries: "無題のシリーズ",
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
              description: tr?.description?.trim() ? tr.description : b.description,
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
              description: tr?.description?.trim() ? tr.description : s.description,
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
    new Date(iso).toLocaleString(
      locale === "mn"
        ? "mn-MN"
        : locale === "ko"
        ? "ko-KR"
        : locale === "ja"
        ? "ja-JP"
        : "en-GB",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );

  const getSeriesCover = (item: SeriesRow) => item.cover_url || item.cover_image_url || "";
  const getBookCover = (item: BookRow) => item.cover_url || "";

  return (
    <main className="min-h-screen theme-soft">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.72)",
                color: "var(--muted)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {t.chip}
            </span>

            <div className="space-y-2">
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: "var(--text)" }}
              >
                {t.heroTitle}
              </h1>
              <p className="max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
                {t.heroBody}
              </p>
            </div>
          </div>

          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-medium transition"
            style={{
              borderColor: "var(--border)",
              background: "rgba(255,255,255,0.55)",
              color: "var(--text)",
            }}
          >
            ← {t.backHome}
          </Link>
        </header>

        <div className="mb-10">
          <div
            className="rounded-[24px] border p-4 text-xs"
            style={{
              borderColor: status === "error" ? "rgba(122,46,46,0.2)" : "var(--border)",
              background: "rgba(233,230,223,0.72)",
              color: status === "error" ? "var(--danger)" : "var(--muted)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            {status === "loading" ? t.chip + "…" : statusMessage}
          </div>
        </div>

        <section className="mb-12 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--muted)" }}
            >
              {t.publishedProjects}
            </h2>
          </div>

          {status !== "loading" && series.length === 0 ? (
            <div
              className="rounded-[24px] border p-5"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.66)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t.supabaseEmpty}
              </p>
            </div>
          ) : null}

          {series.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
              {series.map((item) => {
                const coverSrc = getSeriesCover(item);

                return (
                  <article key={item.id} className="group">
                    <Link href={`/${locale}/reader/series/${item.id}/1`} className="block">
                      <div
                        className="relative overflow-hidden rounded-[24px] border transition duration-300 group-hover:-translate-y-1"
                        style={{
                          aspectRatio: "2 / 3",
                          borderColor: "var(--border)",
                          background:
                            "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))",
                          boxShadow: "var(--shadow-soft)",
                        }}
                      >
                        {coverSrc ? (
                          <>
                            <img
                              src={coverSrc}
                              alt={item.title || t.untitledSeries}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-white/10" />
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
                                  {item.title || t.untitledSeries}
                                </div>
                                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                                  {t.noCover}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3
                              className="line-clamp-2 text-sm font-semibold"
                              style={{ color: "var(--text)" }}
                            >
                              {item.title || t.untitledSeries}
                            </h3>
                            {item.language ? (
                              <span
                                className="rounded-full border px-2 py-0.5 text-[10px]"
                                style={{
                                  borderColor: "var(--border)",
                                  background: "rgba(255,255,255,0.5)",
                                  color: "var(--muted)",
                                }}
                              >
                                {item.language.toUpperCase()}
                              </span>
                            ) : null}
                          </div>

                          {item.description ? (
                            <p className="line-clamp-2 text-[11px]" style={{ color: "var(--muted)" }}>
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                            {t.publishedAt}: {item.published_at ? formatDate(item.published_at) : "—"}
                          </p>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                              {(item.views ?? 0).toLocaleString()} {t.views}
                            </span>

                            <span
                              className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                              style={{
                                borderColor: "rgba(94,99,87,0.28)",
                                background: "rgba(94,99,87,0.14)",
                                color: "var(--text)",
                              }}
                            >
                              {t.startReading}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--muted)" }}
            >
              {t.publishedBooks}
            </h2>
          </div>

          {status !== "loading" && books.length === 0 ? (
            <div
              className="rounded-[24px] border p-5"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.66)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t.supabaseEmpty}
              </p>
            </div>
          ) : null}

          {books.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
              {books.map((item) => {
                const coverSrc = getBookCover(item);

                return (
                  <article key={item.id} className="group">
                    <Link href={`/${locale}/reader/${item.id}/1`} className="block">
                      <div
                        className="relative overflow-hidden rounded-[24px] border transition duration-300 group-hover:-translate-y-1"
                        style={{
                          aspectRatio: "2 / 3",
                          borderColor: "var(--border)",
                          background:
                            "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))",
                          boxShadow: "var(--shadow-soft)",
                        }}
                      >
                        {coverSrc ? (
                          <>
                            <img
                              src={coverSrc}
                              alt={item.title || t.untitledBook}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-white/10" />
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
                                  {item.title || t.untitledBook}
                                </div>
                                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                                  {t.noCover}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="space-y-1">
                          <h3
                            className="line-clamp-2 text-sm font-semibold"
                            style={{ color: "var(--text)" }}
                          >
                            {item.title || t.untitledBook}
                          </h3>

                          {item.description ? (
                            <p className="line-clamp-2 text-[11px]" style={{ color: "var(--muted)" }}>
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                            {t.createdAt}: {formatDate(item.created_at)}
                          </p>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                              {(item.views ?? 0).toLocaleString()} {t.views}
                            </span>

                            <span
                              className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                              style={{
                                borderColor: "rgba(94,99,87,0.28)",
                                background: "rgba(94,99,87,0.14)",
                                color: "var(--text)",
                              }}
                            >
                              {t.startReading}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}