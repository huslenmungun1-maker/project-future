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
  genre?: string | null;
  user_id?: string | null;
  author_label?: string | null;
};

type ProfileMeta = { display_name: string | null; role: string | null };

type TranslationRow = {
  content_type: "series" | "book" | "chapter";
  content_id: string;
  locale: "en" | "mn" | "ko" | "ja";
  title: string | null;
  description: string | null;
  body: string | null;
};

type ContentItem =
  | (SeriesRow & { _type: "series" })
  | (BookRow & { _type: "book" });

const UI_TEXT = {
  en: {
    chip: "Reader",
    heroTitle: "Read published content",
    heroBody: "Pick a published series or book and start from Chapter 1.",
    supabaseOk: "Loaded published content from Supabase.",
    supabaseEmpty: "No published content yet.",
    supabaseError: "Could not load reader content.",
    sectionLabel: "Books",
    startReading: "Start reading",
    createdAt: "Created",
    publishedAt: "Published",
    views: "views",
    noCover: "No cover",
    backHome: "Back to home",
    untitledBook: "Untitled book",
    untitledSeries: "Untitled series",
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
    sectionLabel: "Номууд",
    startReading: "Уншиж эхлэх",
    createdAt: "Үүсгэсэн",
    publishedAt: "Нийтэлсэн",
    views: "үзэлт",
    noCover: "Ковергүй",
    backHome: "Нүүр рүү буцах",
    untitledBook: "Нэргүй ном",
    untitledSeries: "Нэргүй цуврал",
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
    sectionLabel: "도서",
    startReading: "읽기 시작",
    createdAt: "생성일",
    publishedAt: "게시일",
    views: "조회수",
    noCover: "표지 없음",
    backHome: "홈으로",
    untitledBook: "제목 없는 책",
    untitledSeries: "제목 없는 시리즈",
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
    sectionLabel: "書籍",
    startReading: "読み始める",
    createdAt: "作成日",
    publishedAt: "公開日",
    views: "閲覧",
    noCover: "表紙なし",
    backHome: "ホームへ戻る",
    untitledBook: "無題の本",
    untitledSeries: "無題のシリーズ",
    emptyAllTitle: "まだ公開されたコンテンツはありません",
    emptyAllBody: "Enkhverseは始まったばかりです。マンガ、ウェブトゥーンなどを近日公開予定です。",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

export default function ReaderHomePage() {
  const params = useParams();
  const locale = safeLocale(params?.locale) as SupportedLocale;
  const t = UI_TEXT[locale];

  const authClient = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [status, setStatus] = useState<Status>("loading");
  const [books, setBooks] = useState<BookRow[]>([]);
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileMeta>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeType, setActiveType] = useState<string>("all");
  const [isOwner, setIsOwner] = useState(false);
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) setSearchQuery(q);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");

      const [booksRes, seriesRes] = await Promise.all([
        supabase
          .from("books")
          .select("id, title, description, status, created_at, cover_url, views, page_count")
          .eq("status", "published")
          .order("views", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("series")
          .select("id, title, description, created_at, cover_url, cover_image_url, language, published, published_at, views, project_type, genre, user_id, author_label")
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
        const userIds = [...new Set(seriesData.map(s => s.user_id).filter(Boolean))] as string[];

        const [bookTrRes, seriesTrRes, profilesRes] = await Promise.all([
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

          userIds.length > 0
            ? supabase
                .from("profiles")
                .select("user_id, display_name, role")
                .in("user_id", userIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (!bookTrRes.error) {
          const rows = ((bookTrRes.data as TranslationRow[]) || []).filter((r) => r && r.content_id);
          const map = new Map<string, TranslationRow>();
          for (const r of rows) map.set(r.content_id, r);
          translatedBooks = booksData.map((b) => {
            const tr = map.get(b.id);
            return { ...b, title: (tr?.title?.trim() ? tr.title : b.title) as string, description: tr?.description?.trim() ? tr.description : b.description };
          });
        }

        if (!seriesTrRes.error) {
          const rows = ((seriesTrRes.data as TranslationRow[]) || []).filter((r) => r && r.content_id);
          const map = new Map<string, TranslationRow>();
          for (const r of rows) map.set(r.content_id, r);
          translatedSeries = seriesData.map((s) => {
            const tr = map.get(s.id);
            return { ...s, title: (tr?.title?.trim() ? tr.title : s.title) as string, description: tr?.description?.trim() ? tr.description : s.description };
          });
        }

        if (!profilesRes.error && profilesRes.data) {
          const pMap: Record<string, ProfileMeta> = {};
          for (const p of profilesRes.data as Array<{ user_id: string; display_name: string | null; role: string | null }>) {
            pMap[p.user_id] = { display_name: p.display_name, role: p.role };
          }
          if (!cancelled) setProfileMap(pMap);
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

    return () => { cancelled = true; };
  }, [locale]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(
      locale === "mn" ? "mn-MN" : locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-GB",
      { dateStyle: "medium", timeStyle: "short" }
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
      const matchesSearch = !q ||
        s.title?.toLowerCase().includes(q) ||
        s.genre?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q);
      const matchesType = activeType === "all" || s.project_type === activeType;
      return matchesSearch && matchesType;
    });
  }, [series, searchQuery, activeType]);

  const filteredBooks = useMemo(() => {
    if (activeType !== "all") return [];
    const q = searchQuery.toLowerCase();
    return books.filter(b => !q || b.title?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q));
  }, [books, searchQuery, activeType]);

  const allContent = useMemo<ContentItem[]>(() => {
    return [
      ...filteredSeries.map(s => ({ ...s, _type: "series" as const })),
      ...filteredBooks.map(b => ({ ...b, _type: "book" as const })),
    ];
  }, [filteredSeries, filteredBooks]);

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
              style={{ borderColor: "var(--border)", background: "rgba(233,230,223,0.72)", color: "var(--muted)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              {t.chip}
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text)" }}>
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
            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.55)", color: "var(--text)" }}
          >
            ← {t.backHome}
          </Link>
        </header>

        {/* Search + filters */}
        <div className="mb-8 space-y-3">
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              borderRadius: 9999,
              background: searchFocused ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.80)",
              border: `1.5px solid ${searchFocused ? "rgba(94,99,87,0.32)" : "rgba(94,99,87,0.14)"}`,
              boxShadow: searchFocused
                ? "0 0 0 4.5px rgba(94,99,87,0.09), 0 4px 28px rgba(0,0,0,0.10)"
                : "0 2px 10px rgba(0,0,0,0.055)",
              transition: "border-color 220ms ease, box-shadow 220ms ease, background 220ms ease",
            }}
          >
            <svg
              width="15" height="15" viewBox="0 0 15 15" fill="none"
              style={{ position: "absolute", left: 18, flexShrink: 0, pointerEvents: "none", opacity: searchFocused ? 0.6 : 0.35, transition: "opacity 220ms ease" }}
            >
              <circle cx="6.3" cy="6.3" r="4.8" stroke="var(--accent)" strokeWidth="1.6" />
              <path d="M10 10L13 13" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search titles, genres, series…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: "100%",
                padding: "13px 44px 13px 44px",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--text)",
                fontWeight: 400,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(94,99,87,0.12)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: 12,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "novel", "manga", "webtoon", "comic", "artbook"] as const).map(type => (
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
              style={{ borderColor: "rgba(122,46,46,0.2)", background: "rgba(233,230,223,0.72)", color: "var(--danger)", boxShadow: "var(--shadow-soft)" }}
            >
              {t.supabaseError}
            </div>
          </div>
        )}

        {status === "ok" && allContent.length === 0 && (
          <div
            className="mb-10 flex flex-col items-center justify-center rounded-[28px] border py-16 text-center"
            style={{ borderColor: "var(--border)", background: "linear-gradient(145deg, rgba(233,230,223,0.80), rgba(255,255,255,0.55))", boxShadow: "var(--shadow-soft)" }}
          >
            <h2 className="mb-2 text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
              {t.emptyAllTitle}
            </h2>
            <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {t.emptyAllBody}
            </p>
          </div>
        )}

        {/* Unified Books section */}
        <section className="space-y-5">
          <h2
            className="text-sm font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--muted)" }}
          >
            {t.sectionLabel}
          </h2>

          {status === "loading" ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} n={i} />)}
            </div>
          ) : allContent.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5 fade-in">
              {allContent.map((item) => {
                if (item._type === "book") {
                  const coverSrc = getBookCover(item);
                  return (
                    <article key={item.id} className="group">
                      <Link href={`/${locale}/reader/${item.id}/1`} className="block">
                        <div
                          className="relative overflow-hidden rounded-[24px] border transition duration-300 group-hover:-translate-y-1"
                          style={{ aspectRatio: "2 / 3", borderColor: "var(--border)", background: "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))", boxShadow: "var(--shadow-soft)" }}
                        >
                          {coverSrc ? (
                            <>
                              <img src={coverSrc} alt={item.title || t.untitledBook} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-white/10" />
                              <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/30 to-transparent" />
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(94,99,87,0.24),rgba(217,212,204,0.9))]" />
                              <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/35 to-transparent" />
                              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                <div className="space-y-3">
                                  <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--muted)" }}>Enkhverse</div>
                                  <div className="text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>{item.title || t.untitledBook}</div>
                                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>{t.noCover}</div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          <h3 className="line-clamp-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                            {item.title || t.untitledBook}
                          </h3>
                          {item.description ? (
                            <p className="line-clamp-2 text-[11px]" style={{ color: "var(--muted)" }}>{item.description}</p>
                          ) : null}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                              {(item.views ?? 0).toLocaleString()} {t.views}
                            </span>
                            <span
                              className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                              style={{ borderColor: "rgba(94,99,87,0.28)", background: "rgba(94,99,87,0.14)", color: "var(--text)" }}
                            >
                              {t.startReading}
                            </span>
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
                }

                // Series card
                const coverSrc = getSeriesCover(item);
                const prof = profileMap[item.user_id ?? ""] ?? null;
                const authorName = prof?.role === "owner" ? "Project Team" : (prof?.display_name || null);
                const authorLabel = item.author_label || null;
                const descExpanded = expandedDescId === item.id;
                return (
                  <article key={item.id} className="group">
                    <Link href={`/${locale}/reader/series/${item.id}`} className="block">
                      <div
                        className="relative overflow-hidden rounded-[24px] border transition duration-300 group-hover:-translate-y-1"
                        style={{ aspectRatio: "2 / 3", borderColor: "var(--border)", background: "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))", boxShadow: "var(--shadow-soft)" }}
                      >
                        {coverSrc ? (
                          <>
                            <img src={coverSrc} alt={item.title || t.untitledSeries} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-white/10" />
                            <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/30 to-transparent" />
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(94,99,87,0.24),rgba(217,212,204,0.9))]" />
                            <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/35 to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                              <div className="space-y-3">
                                <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--muted)" }}>Enkhverse</div>
                                <div className="text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>{item.title || t.untitledSeries}</div>
                                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{t.noCover}</div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.project_type && (
                            <span
                              className="rounded-full border px-2 py-0.5 text-[10px] capitalize"
                              style={{ borderColor: "rgba(94,99,87,0.25)", background: "rgba(94,99,87,0.1)", color: "var(--accent)" }}
                            >
                              {item.project_type}
                            </span>
                          )}
                          {item.language ? (
                            <span
                              className="rounded-full border px-2 py-0.5 text-[10px]"
                              style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.5)", color: "var(--muted)" }}
                            >
                              {item.language.toUpperCase()}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: "var(--text)" }}>
                          {item.title || t.untitledSeries}
                        </h3>
                        {authorName && (
                          <p style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.01em" }}>
                            {authorLabel ? <span style={{ fontStyle: "italic" }}>{authorLabel} </span> : null}
                            <span style={{ fontWeight: 500 }}>{authorName}</span>
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                            {(item.views ?? 0).toLocaleString()} {t.views}
                          </span>
                          <span
                            className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                            style={{ borderColor: "rgba(94,99,87,0.28)", background: "rgba(94,99,87,0.14)", color: "var(--text)" }}
                          >
                            {t.startReading}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Expandable description — outside link */}
                    {item.description && (
                      <div style={{ paddingTop: 5, paddingLeft: 1 }}>
                        <button
                          onClick={() => setExpandedDescId(descExpanded ? null : item.id)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
                            color: "var(--accent)", background: "none", border: "none",
                            cursor: "pointer", padding: 0,
                          }}
                        >
                          <svg
                            width="8" height="8" viewBox="0 0 8 8" fill="none"
                            style={{ transition: "transform 240ms cubic-bezier(0.4,0,0.2,1)", transform: descExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                          >
                            <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {descExpanded ? "Close" : "Read description"}
                        </button>
                        <div style={{
                          maxHeight: descExpanded ? "280px" : "0px",
                          overflow: "hidden",
                          transition: "max-height 320ms cubic-bezier(0.4,0,0.2,1)",
                        }}>
                          <p style={{ fontSize: 11, lineHeight: 1.65, color: "var(--muted)", paddingTop: 6, paddingBottom: 2 }}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    )}

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
      </div>
    </main>
  );
}
