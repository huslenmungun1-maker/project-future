"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";
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

type ChapterRow = {
  id: string;
  title: string;
  chapter_number: number | null;
  created_at: string;
  content: string | null;
  book_id?: string | null;
  status?: string | null;
  is_published?: boolean | null;
  published_at?: string | null;
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
    back: "Back to Reader",
    chip: "Reader · Book",
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
    untitledBook: "Untitled book",
  },
  mn: {
    back: "Уншигч руу буцах",
    chip: "Уншигч · Ном",
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
    untitledBook: "Нэргүй ном",
  },
  ko: {
    back: "리더로 돌아가기",
    chip: "리더 · 책",
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
    untitledBook: "제목 없는 책",
  },
  ja: {
    back: "リーダーへ戻る",
    chip: "リーダー · 本",
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
    untitledBook: "無題の本",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

function safeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

function isPublishedChapter(chapter: ChapterRow) {
  return (
    chapter.status === "published" ||
    chapter.is_published === true ||
    Boolean(chapter.published_at)
  );
}

export default function ReaderChapterPage() {
  const params = useParams();

  const locale = safeLocale((params?.locale as string) || "en");
  const t = UI_TEXT[locale];

  const bookId = (params?.bookId as string) || "";
  const chapterParam = (params?.chapterNumber as string) || "1";
  const chapterNumber = Number(chapterParam) || 1;

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [views, setViews] = useState<number>(0);

  const [displayTitle, setDisplayTitle] = useState<string>("");
  const [displayChapters, setDisplayChapters] = useState<ChapterRow[]>([]);

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
    return displayChapters.find((c) => (c.chapter_number ?? 0) === chapterNumber) || null;
  }, [displayChapters, chapterNumber]);

  const currentChapterIndex = useMemo(() => {
    return displayChapters.findIndex((c) => (c.chapter_number ?? 0) === chapterNumber);
  }, [displayChapters, chapterNumber]);

  const prevChapter =
    currentChapterIndex > 0 ? displayChapters[currentChapterIndex - 1] : null;

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
      setTitle("");
      setCoverUrl("");
      setViews(0);
      setDisplayTitle("");
      setDisplayChapters([]);

      if (!bookId) {
        setStatus("error");
        setError("Missing book id.");
        return;
      }

      const incrementView = async () => {
        try {
          await supabase.rpc("increment_book_views", { target_id: bookId });
        } catch {
          try {
            const { data } = await supabase
              .from("books")
              .select("views")
              .eq("id", bookId)
              .maybeSingle();

            const current = Number((data as { views?: number | null } | null)?.views ?? 0);

            await supabase.from("books").update({ views: current + 1 }).eq("id", bookId);
          } catch {
            // ignore view increment failure
          }
        }
      };

      const applyTranslations = async (args: {
        locale: Locale;
        bookId: string;
        baseTitle: string;
        baseChapters: ChapterRow[];
      }) => {
        const { locale, bookId, baseTitle, baseChapters } = args;

        setDisplayTitle(baseTitle);
        setDisplayChapters(baseChapters);

        try {
          const contentTrRes = await supabase
            .from("content_translations")
            .select("content_type, content_id, locale, title, description, body")
            .eq("content_type", "book")
            .eq("content_id", bookId)
            .eq("locale", locale)
            .maybeSingle();

          if (contentTrRes?.error) {
            console.warn("Book translation load error:", contentTrRes.error);
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
          console.warn("Translation lookup skipped.", e);
          setDisplayTitle(baseTitle);
          setDisplayChapters(baseChapters);
        }
      };

      const { data: book, error: bookErr } = await supabase
        .from("books")
        .select("id, title, description, status, created_at, cover_url, views")
        .eq("id", bookId)
        .maybeSingle();

      if (bookErr) {
        setStatus("error");
        setError(bookErr.message);
        return;
      }

      if (!book || (book as BookRow).status !== "published") {
        setStatus("error");
        setError(t.notFound);
        return;
      }

      const bookRow = book as BookRow;

      setTitle(bookRow.title);
      setDisplayTitle(bookRow.title);
      setCoverUrl(bookRow.cover_url || "");
      setViews(Number(bookRow.views ?? 0) + 1);

      await incrementView();

      const { data: bookCh, error: chErr } = await supabase
        .from("chapters")
        .select(
          "id, title, chapter_number, created_at, content, book_id, status, is_published, published_at"
        )
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true });

      if (chErr) {
        setStatus("error");
        setError(chErr.message);
        return;
      }

      const allChapters = (bookCh as ChapterRow[]) || [];
      const publishedChapters = allChapters.filter(isPublishedChapter);

      if (publishedChapters.length === 0) {
        setStatus("error");
        setError(t.notFound);
        return;
      }

      const hasCurrentChapter = publishedChapters.some(
        (ch) => (ch.chapter_number ?? 0) === chapterNumber
      );

      if (!hasCurrentChapter) {
        setStatus("error");
        setError(t.notFound);
        return;
      }

      await applyTranslations({
        locale: locale as Locale,
        bookId,
        baseTitle: bookRow.title,
        baseChapters: publishedChapters,
      });

      setStatus("ok");
    };

    load();
  }, [bookId, chapterNumber, locale, t.notFound]);

  const basePath = `/${locale}/reader/${bookId}`;
  const prevHref = prevChapter ? `${basePath}/${prevChapter.chapter_number ?? 1}` : null;
  const nextHref = nextChapter ? `${basePath}/${nextChapter.chapter_number ?? 1}` : null;
  const homeHref = `/${locale}/reader`;

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

  if (status === "error") {
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
            {t.goHome}
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
              {t.loadError} {error ? `(${error})` : ""}
            </p>
          </div>
        </div>
      </main>
    );
  }

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
                {coverUrl ? (
                  <>
                    <img
                      src={coverUrl}
                      alt={displayTitle || title}
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
                          {displayTitle || title || t.untitledBook}
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
                    ← {t.back}
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
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {displayTitle || title || t.untitledBook}
              </h2>

              <div className="space-y-2">
                {displayChapters.map((ch) => {
                  const href = `${basePath}/${ch.chapter_number ?? 1}`;
                  const active = (ch.chapter_number ?? 0) === chapterNumber;

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
                          {t.chapter} {ch.chapter_number ?? "—"}
                        </span>
                        <span
                          className="truncate text-[11px]"
                          style={{ color: "var(--muted)" }}
                        >
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
                  {displayTitle || title || t.untitledBook}
                </h1>

                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {t.chapter} {chapterNumber}
                  {currentChapter?.title ? ` · ${currentChapter.title}` : ""}
                </p>

                {currentChapter?.created_at && (
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {t.createdAt}:{" "}
                    {new Date(currentChapter.created_at).toLocaleString(localeForDate, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
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
              {contentText ? (
                <div className="mx-auto max-w-3xl">
                  <pre
                    className="whitespace-pre-wrap break-words font-sans text-[15px] leading-8"
                    style={{ color: "var(--text)" }}
                  >
                    {contentText}
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