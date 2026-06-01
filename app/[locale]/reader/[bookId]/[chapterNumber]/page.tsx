"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
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
  price?: number | null;
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

  const authClient = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const stripeVerified = useRef(false);

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [views, setViews] = useState<number>(0);

  const [displayTitle, setDisplayTitle] = useState<string>("");
  const [displayChapters, setDisplayChapters] = useState<ChapterRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [resumeChapter, setResumeChapter] = useState<number | null>(null);
  const [chapterSearch, setChapterSearch] = useState("");

  const router = useRouter();

  useEffect(() => {
    authClient.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL) setIsOwner(true);
    });
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
          "id, title, chapter_number, created_at, content, book_id, status, is_published, published_at, price"
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

      // Save reading progress + resume check
      const { data: { user: progressUser } } = await authClient.auth.getUser();
      if (progressUser) {
        await authClient.from("reading_progress").upsert(
          { user_id: progressUser.id, content_id: bookId, content_type: "book_chapter", last_page: chapterNumber, updated_at: new Date().toISOString() },
          { onConflict: "user_id,content_id" }
        );
        if (chapterNumber === 1) {
          const { data: prog } = await authClient.from("reading_progress").select("last_page").eq("user_id", progressUser.id).eq("content_id", bookId).maybeSingle();
          if (prog && prog.last_page > 1) setResumeChapter(prog.last_page);
        }
      }

      // Check if current chapter is paid and if user has unlocked it
      const currentCh = publishedChapters.find((c) => (c.chapter_number ?? 0) === chapterNumber);
      const chapterPrice = Number(currentCh?.price ?? 0);
      if (chapterPrice > 0 && !stripeVerified.current) {
        const { data: { user } } = await authClient.auth.getUser();
        if (user && currentCh) {
          const { data: unlock } = await authClient
            .from("chapter_unlocks")
            .select("id")
            .eq("user_id", user.id)
            .eq("chapter_id", currentCh.id)
            .maybeSingle();
          let hasAccess = !!unlock;
          if (!hasAccess) {
            const { data: purchase } = await authClient
              .from("purchases")
              .select("id")
              .eq("user_id", user.id)
              .eq("chapter_id", currentCh.id)
              .maybeSingle();
            hasAccess = !!purchase;
          }
          if (!stripeVerified.current) setIsUnlocked(hasAccess);
        } else {
          if (!stripeVerified.current) setIsUnlocked(false);
        }
      } else if (!stripeVerified.current) {
        setIsUnlocked(chapterPrice === 0);
      }

      setStatus("ok");
    };

    load();
  }, [bookId, chapterNumber, locale, t.notFound, authClient]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const basePath = `/${locale}/reader/${bookId}`;
  const prevHref = prevChapter ? `${basePath}/${prevChapter.chapter_number ?? 1}` : null;
  const nextHref = nextChapter ? `${basePath}/${nextChapter.chapter_number ?? 1}` : null;
  const homeHref = `/${locale}/reader`;

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

  async function handleDeleteChapter() {
    if (!currentChapter) return;
    if (!window.confirm("Delete this chapter? This cannot be undone.")) return;
    const { error: delErr } = await authClient.from("chapters").delete().eq("id", currentChapter.id);
    if (delErr) { alert("Delete failed: " + delErr.message); return; }
    router.replace(`/${locale}/reader/${bookId}`);
  }

  async function handleToggleChapterPublish() {
    if (!currentChapter) return;
    const newVal = !currentChapter.is_published;
    if (!window.confirm(newVal ? "Publish this chapter?" : "Unpublish this chapter?")) return;
    const { error: updErr } = await authClient.from("chapters").update({ is_published: newVal, published_at: newVal ? new Date().toISOString() : null }).eq("id", currentChapter.id);
    if (updErr) { alert("Failed: " + updErr.message); return; }
    setDisplayChapters(prev => prev.map(c => c.id === currentChapter.id ? { ...c, is_published: newVal } : c));
  }

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

              {/* Chapter search */}
              <input
                type="text"
                value={chapterSearch}
                onChange={e => setChapterSearch(e.target.value)}
                placeholder="Search chapters…"
                style={{ width: "100%", padding: "7px 12px", marginBottom: 8, background: "rgba(255,255,255,0.55)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />

              {/* Resume prompt */}
              {resumeChapter !== null && (
                <div style={{ padding: "8px 12px", marginBottom: 8, borderRadius: 10, background: "rgba(182,160,124,0.12)", border: "1px solid rgba(182,160,124,0.22)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>Resume from chapter {resumeChapter}?</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={`${basePath}/${resumeChapter}`} onClick={() => setResumeChapter(null)}
                      style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, background: "#b6a07c", color: "#0a0a0c", fontWeight: 700, textDecoration: "none" }}>
                      Resume
                    </a>
                    <button onClick={() => setResumeChapter(null)}
                      style={{ fontSize: 11, padding: "3px 10px", borderRadius: 9999, border: "1px solid rgba(0,0,0,0.15)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {displayChapters.filter(ch => {
                  if (!chapterSearch.trim()) return true;
                  const q = chapterSearch.trim().toLowerCase();
                  if (/^\d+$/.test(q)) return String(ch.chapter_number).includes(q);
                  return (ch.title || "").toLowerCase().includes(q) || String(ch.chapter_number).includes(q);
                }).map((ch) => {
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {ch.title ? (
                            <span className="truncate text-[11px]" style={{ color: "var(--muted)" }}>
                              {ch.title}
                            </span>
                          ) : null}
                          {Number(ch.price ?? 0) > 0 && (
                            <span
                              className="text-[10px] rounded-full px-1.5 py-0.5 font-semibold"
                              style={{
                                background: "rgba(10,10,12,0.08)",
                                color: "var(--muted)",
                                border: "1px solid rgba(47,47,47,0.12)",
                              }}
                            >
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
            {isOwner && currentChapter && (
              <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
                <button
                  onClick={handleToggleChapterPublish}
                  style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(194,120,0,0.45)", background: "rgba(194,120,0,0.08)", color: "#8a5500", cursor: "pointer" }}
                >
                  {currentChapter.is_published ? "Unpublish Chapter" : "Publish Chapter"}
                </button>
                <button
                  onClick={handleDeleteChapter}
                  style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(185,28,28,0.4)", background: "rgba(185,28,28,0.07)", color: "#b01c1c", cursor: "pointer" }}
                >
                  Delete Chapter
                </button>
              </div>
            )}
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
              {isPaidChapter && !isUnlocked ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 20,
                    padding: "48px 24px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      border: "1.5px solid rgba(47,47,47,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text)", marginBottom: 8 }}
                    >
                      {t.locked}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(chapterPrice)}
                    </p>
                  </div>
                  {unlockError && (
                    <p className="text-xs" style={{ color: "#c85252" }}>
                      {unlockError === "insufficient_balance"
                        ? t.insufficientBalance
                        : unlockError === "already_unlocked"
                        ? t.unlocked
                        : t.unlockError}
                    </p>
                  )}
                  {!userId ? (
                    <Link
                      href={`/${locale}/login`}
                      className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold transition"
                      style={{
                        borderColor: "rgba(47,47,47,0.18)",
                        background: "rgba(10,10,12,0.08)",
                        color: "var(--text)",
                      }}
                    >
                      {t.loginToUnlock}
                    </Link>
                  ) : (
                    <button
                      onClick={handleStripeCheckout}
                      disabled={unlocking}
                      className="inline-flex items-center rounded-full border px-6 py-2.5 text-xs font-semibold transition"
                      style={{
                        borderColor: "rgba(47,47,47,0.18)",
                        background: "rgba(10,10,12,0.88)",
                        color: "#eceae4",
                        cursor: unlocking ? "not-allowed" : "pointer",
                        opacity: unlocking ? 0.7 : 1,
                      }}
                    >
                      {unlocking
                        ? t.unlocking
                        : `${t.unlock} ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(chapterPrice)}`}
                    </button>
                  )}
                </div>
              ) : contentText ? (
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