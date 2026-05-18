"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
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
  cover_image_url?: string | null;
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
  project_type?: string | null;
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
    emptySeriesTitle: "No series published yet",
    emptySeriesBody: "Check back soon — stories are on their way.",
    emptyBooksTitle: "No books published yet",
    emptyBooksBody: "Nothing here yet. More content is coming.",
    emptyAllTitle: "Nothing published yet",
    emptyAllBody: "Enkhverse is just getting started. Check back soon for manga, webtoons, and more.",
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
    emptySeriesTitle: "Цуврал нийтлэгдээгүй байна",
    emptySeriesBody: "Удахгүй шинэ цувралууд гарах болно.",
    emptyBooksTitle: "Ном нийтлэгдээгүй байна",
    emptyBooksBody: "Одоохондоо юу ч алга. Контент удахгүй нэмэгдэнэ.",
    emptyAllTitle: "Одоогоор нийтлэгдсэн зүйл алга",
    emptyAllBody: "Enkhverse эхэлж байна. Удахгүй манга, вэбтун болон бусад контентуудтай болно.",
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
    emptySeriesTitle: "게시된 시리즈가 없습니다",
    emptySeriesBody: "곧 새로운 이야기가 올라올 예정입니다.",
    emptyBooksTitle: "게시된 책이 없습니다",
    emptyBooksBody: "아직 아무것도 없습니다. 곧 콘텐츠가 추가될 예정입니다.",
    emptyAllTitle: "아직 게시된 콘텐츠가 없습니다",
    emptyAllBody: "Enkhverse가 막 시작되었습니다. 곧 만화, 웹툰 등 다양한 콘텐츠를 만나보세요.",
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
    emptySeriesTitle: "シリーズはまだ公開されていません",
    emptySeriesBody: "もうすぐ新しいストーリーが届きます。",
    emptyBooksTitle: "本はまだ公開されていません",
    emptyBooksBody: "まだ何もありません。コンテンツはまもなく追加されます。",
    emptyAllTitle: "まだ公開されたコンテンツはありません",
    emptyAllBody: "Enkhverseは始まったばかりです。マンガ、ウェブトゥーンなどを近日公開予定です。",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

export default function ReaderHomePage() {
  const params = useParams();
  const locale = safeLocale(params?.locale) as SupportedLocale;
  const t = UI_TEXT[locale];

  // Cookie-aware client — required for authenticated mutations (delete, update)
  const authClient = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [status, setStatus] = useState<Status>("loading");
  const [books, setBooks] = useState<BookRow[]>([]);
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("all");
  const [isOwner, setIsOwner] = useState(false);


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
            "id, title, description, created_at, cover_url, cover_image_url, language, published, published_at, views, project_type"
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

      const { data: { session: ownerSess } } = await authClient.auth.getSession();
      if (ownerSess?.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL) {
        if (!cancelled) setIsOwner(true);
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
  const getBookCover = (item: BookRow) => item.cover_url || item.cover_image_url || "";

  async function handleDeleteSeries(id: string) {
    if (!window.confirm("Delete this series and all its chapters? This cannot be undone.")) return;
    const { error } = await authClient.rpc("delete_series_cascade", { p_series_id: id });
    if (error) { alert("Delete failed: " + error.message); return; }
    setSeries(prev => prev.filter(s => s.id !== id));
  }

  async function handleUnpublishSeries(id: string) {
    if (!window.confirm("Unpublish this series? It will be hidden from readers.")) return;
    const { error } = await authClient.from("series").update({ published: false, published_at: null }).eq("id", id);
    if (error) { alert("Failed: " + error.message); return; }
    setSeries(prev => prev.filter(s => s.id !== id));
  }

  async function handleDeleteBook(id: string) {
    if (!window.confirm("Delete this book and all its chapters? This cannot be undone.")) return;
    await authClient.from("book_chapters").delete().eq("book_id", id);
    await authClient.from("chapters").delete().eq("book_id", id);
    const { error } = await authClient.from("books").delete().eq("id", id);
    if (error) { alert("Delete failed: " + error.message); return; }
    setBooks(prev => prev.filter(b => b.id !== id));
  }

  async function handleUnpublishBook(id: string) {
    if (!window.confirm("Unpublish this book? It will be hidden from readers.")) return;
    const { error } = await authClient.from("books").update({ status: "draft" }).eq("id", id);
    if (error) { alert("Failed: " + error.message); return; }
    setBooks(prev => prev.filter(b => b.id !== id));
  }

  const filteredSeries = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return series.filter(s => {
      const matchesSearch = !q || s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
      const matchesType = activeType === "all" || s.project_type === activeType;
      return matchesSearch && matchesType;
    });
  }, [series, searchQuery, activeType]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return books.filter(b =>
      !q || b.title?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q)
    );
  }, [books, searchQuery]);

  const SkeletonCard = ({ n }: { n: number }) => (
    <div className="space-y-3" style={{ animationDelay: `${n * 60}ms` }}>
      <div className="skeleton rounded-[24px]" style={{ aspectRatio: "2/3" }} />
      <div className="space-y-1.5 px-0.5">
        <div className="skeleton h-3.5 rounded-md" style={{ width: "70%" }} />
        <div className="skeleton h-3 rounded-md" style={{ width: "45%" }} />
        <div className="skeleton h-3 rounded-md" style={{ width: "30%" }} />
      </div>
    </div>
  );

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

        {/* Search + filters */}
        <div className="mb-8 space-y-3">
          <input
            type="search"
            placeholder="Search by title…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl px-5 py-3 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(47,47,47,0.12)",
              color: "var(--text)",
              boxShadow: "var(--shadow-soft)",
            }}
          />
          <div className="flex flex-wrap gap-2">
            {(["all","novel","manga","webtoon","comic","artbook"] as const).map(type => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className="rounded-full border px-4 py-1.5 text-[11px] font-semibold capitalize transition"
                style={{
                  borderColor: activeType === type ? "rgba(94,99,87,0.4)" : "var(--border)",
                  background: activeType === type ? "rgba(94,99,87,0.14)" : "rgba(255,255,255,0.5)",
                  color: activeType === type ? "var(--accent)" : "var(--muted)",
                }}
              >
                {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {status === "error" && (
          <div className="mb-10">
            <div
              className="rounded-[24px] border p-4 text-xs"
              style={{
                borderColor: "rgba(122,46,46,0.2)",
                background: "rgba(233,230,223,0.72)",
                color: "var(--danger)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              {t.supabaseError}
            </div>
          </div>
        )}

        {status === "ok" && books.length === 0 && series.length === 0 && (
          <div className="mb-10 flex flex-col items-center justify-center rounded-[28px] border py-16 text-center"
            style={{
              borderColor: "var(--border)",
              background: "linear-gradient(145deg, rgba(233,230,223,0.80), rgba(255,255,255,0.55))",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2 className="mb-2 text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
              {t.emptyAllTitle}
            </h2>
            <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {t.emptyAllBody}
            </p>
          </div>
        )}

        <section className="mb-12 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--muted)" }}
            >
              {t.publishedProjects}
            </h2>
          </div>

          {status === "loading" ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} n={i} />)}
            </div>
          ) : filteredSeries.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5 fade-in">
              {filteredSeries.map((item) => {
                const coverSrc = getSeriesCover(item);

                return (
                  <article key={item.id} className="group">
                    <Link href={`/${locale}/reader/series/${item.id}`} className="block">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className="line-clamp-2 text-sm font-semibold"
                              style={{ color: "var(--text)" }}
                            >
                              {item.title || t.untitledSeries}
                            </h3>
                            {item.project_type && (
                              <span
                                className="rounded-full border px-2 py-0.5 text-[10px] capitalize"
                                style={{
                                  borderColor: "rgba(94,99,87,0.25)",
                                  background: "rgba(94,99,87,0.1)",
                                  color: "var(--accent)",
                                }}
                              >
                                {item.project_type}
                              </span>
                            )}
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
                    {isOwner && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6, paddingLeft: 2 }}>
                        <button
                          onClick={() => handleUnpublishSeries(item.id)}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(194,120,0,0.45)", background: "rgba(194,120,0,0.08)", color: "#8a5500", cursor: "pointer" }}
                        >
                          Unpublish
                        </button>
                        <button
                          onClick={() => handleDeleteSeries(item.id)}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(185,28,28,0.4)", background: "rgba(185,28,28,0.07)", color: "#b01c1c", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
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

          {status === "ok" && filteredBooks.length === 0 && series.length > 0 ? (
            <div
              className="flex items-center gap-4 rounded-[20px] border px-5 py-4"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.66)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{t.emptyBooksTitle}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{t.emptyBooksBody}</p>
              </div>
            </div>
          ) : null}

          {status === "loading" ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} n={i} />)}
            </div>
          ) : filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5 fade-in">
              {filteredBooks.map((item) => {
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
                    {isOwner && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6, paddingLeft: 2 }}>
                        <button
                          onClick={() => handleUnpublishBook(item.id)}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(194,120,0,0.45)", background: "rgba(194,120,0,0.08)", color: "#8a5500", cursor: "pointer" }}
                        >
                          Unpublish
                        </button>
                        <button
                          onClick={() => handleDeleteBook(item.id)}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(185,28,28,0.4)", background: "rgba(185,28,28,0.07)", color: "#b01c1c", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
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