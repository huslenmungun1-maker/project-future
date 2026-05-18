"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SeriesRow = {
  id: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  cover_url: string | null;
  published: boolean | null;
  published_at: string | null;
  language: string | null;
  project_type: string | null;
  user_id: string | null;
};

type ChapterRow = {
  id: string;
  chapter_number: number;
  title: string | null;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type SupportedLocale = "en" | "mn" | "ko" | "ja";

const UI = {
  en: { back: "Browse", startReading: "Start reading", continueReading: "Continue reading", chapter: "Chapter", chapters: "Chapters", noChapters: "No chapters published yet.", notFound: "Series not found.", loading: "Loading…", by: "By", followers: "followers", views: "views" },
  mn: { back: "Үзэх", startReading: "Уншиж эхлэх", continueReading: "Үргэлжлүүлэх", chapter: "Бүлэг", chapters: "Бүлгүүд", noChapters: "Нийтлэгдсэн бүлэг алга.", notFound: "Цуврал олдсонгүй.", loading: "Ачаалж байна…", by: "Зохиолч", followers: "дагагч", views: "үзэлт" },
  ko: { back: "탐색", startReading: "읽기 시작", continueReading: "계속 읽기", chapter: "챕터", chapters: "챕터 목록", noChapters: "아직 게시된 챕터가 없습니다.", notFound: "시리즈를 찾을 수 없습니다.", loading: "불러오는 중…", by: "작가", followers: "팔로워", views: "조회수" },
  ja: { back: "ブラウズ", startReading: "読み始める", continueReading: "続きを読む", chapter: "チャプター", chapters: "チャプター一覧", noChapters: "まだ公開されたチャプターはありません。", notFound: "シリーズが見つかりません。", loading: "読み込み中…", by: "作者", followers: "フォロワー", views: "閲覧" },
} as const;

function normLocale(r: string): SupportedLocale {
  return (["en","mn","ko","ja"].includes(r) ? r : "en") as SupportedLocale;
}

export default function SeriesDetailPage() {
  const params = useParams() as Record<string, string>;
  const locale = normLocale(params.locale || "en");
  const seriesId = params.seriesId || "";
  const t = UI[locale];
  const router = useRouter();

  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [creator, setCreator] = useState<ProfileRow | null>(null);
  const [progressChapterId, setProgressChapterId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [status, setStatus] = useState<"loading"|"ok"|"error">("loading");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!seriesId) { if (alive) setStatus("error"); return; }

      const { data: { session: authSess } } = await supabase.auth.getSession();
      const ownerLocal = authSess?.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL;
      if (alive) setIsOwner(ownerLocal);

      const { data: s } = await supabase
        .from("series")
        .select("id,title,description,cover_image_url,cover_url,published,published_at,language,project_type,user_id")
        .eq("id", seriesId)
        .maybeSingle();

      if (!alive) return;
      if (!s || (!ownerLocal && !s.published && !s.published_at)) { setStatus("error"); return; }
      setSeries(s as SeriesRow);

      const { data: chs } = await (ownerLocal
        ? supabase.from("chapters").select("id,chapter_number,title,is_published,published_at,created_at").eq("series_id", seriesId).order("chapter_number", { ascending: true })
        : supabase.from("chapters").select("id,chapter_number,title,is_published,published_at,created_at").eq("series_id", seriesId).or("is_published.eq.true,published_at.not.is.null").order("chapter_number", { ascending: true })
      );

      if (!alive) return;
      setChapters((chs as ChapterRow[]) || []);

      if (s.user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id,display_name,username,avatar_url")
          .eq("id", s.user_id)
          .maybeSingle();
        if (alive && p) setCreator(p as ProfileRow);

        const { count } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("followed_id", s.user_id);
        if (alive) setFollowerCount(count ?? 0);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (alive && session?.user) {
        const { data: prog } = await supabase
          .from("read_progress")
          .select("chapter_id")
          .eq("user_id", session.user.id)
          .eq("series_id", seriesId)
          .maybeSingle();
        if (alive && prog?.chapter_id) setProgressChapterId(prog.chapter_id);
      }

      if (alive) setStatus("ok");
    }
    load();
    return () => { alive = false; };
  }, [seriesId]);

  const progressChapter = useMemo(
    () => chapters.find(c => c.id === progressChapterId) ?? null,
    [chapters, progressChapterId]
  );

  const coverSrc = series?.cover_image_url || series?.cover_url || "";
  const typeLabel = series?.project_type
    ? series.project_type.charAt(0).toUpperCase() + series.project_type.slice(1)
    : null;

  async function handleDeleteSeries() {
    if (!series) return;
    if (!window.confirm("Delete this series and all its chapters? This cannot be undone.")) return;
    const { error } = await supabase.rpc("delete_series_cascade", { p_series_id: series.id });
    if (error) { alert("Delete failed: " + error.message); return; }
    router.replace(`/${locale}/reader`);
  }

  async function handleTogglePublishSeries() {
    if (!series) return;
    const newPublished = !series.published;
    const msg = newPublished ? "Publish this series?" : "Unpublish this series? Readers won't see it anymore.";
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from("series").update({ published: newPublished, published_at: newPublished ? new Date().toISOString() : null }).eq("id", series.id);
    if (error) { alert("Failed: " + error.message); return; }
    setSeries(prev => prev ? { ...prev, published: newPublished, published_at: newPublished ? new Date().toISOString() : null } : prev);
  }

  async function handleDeleteChapter(id: string) {
    if (!window.confirm("Delete this chapter? This cannot be undone.")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) { alert("Delete failed: " + error.message); return; }
    setChapters(prev => prev.filter(c => c.id !== id));
  }

  async function handleToggleChapterPublish(id: string, currentlyPublished: boolean) {
    const newVal = !currentlyPublished;
    const msg = newVal ? "Publish this chapter?" : "Unpublish this chapter?";
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from("chapters").update({ is_published: newVal, published_at: newVal ? new Date().toISOString() : null }).eq("id", id);
    if (error) { alert("Failed: " + error.message); return; }
    setChapters(prev => prev.map(c => c.id === id ? { ...c, is_published: newVal, published_at: newVal ? new Date().toISOString() : null } : c));
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen theme-soft">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="skeleton h-4 rounded-full mb-8" style={{ width: 80 }} />
          <div
            className="rounded-[32px] border overflow-hidden mb-8"
            style={{ borderColor: "var(--border)", background: "rgba(233,230,223,0.72)", boxShadow: "var(--shadow-soft)" }}
          >
            <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
              <div className="skeleton" style={{ minHeight: 320 }} />
              <div className="p-8 space-y-4">
                <div className="skeleton h-7 rounded-lg" style={{ width: "65%" }} />
                <div className="skeleton h-4 rounded-md" style={{ width: "40%" }} />
                <div className="skeleton h-3 rounded-md" style={{ width: "90%", marginTop: 24 }} />
                <div className="skeleton h-3 rounded-md" style={{ width: "80%" }} />
                <div className="skeleton h-3 rounded-md" style={{ width: "60%" }} />
                <div className="skeleton h-9 rounded-full" style={{ width: 160, marginTop: 24 }} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-[16px]" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (status === "error" || !series) {
    return (
      <main className="min-h-screen theme-soft">
        <div className="mx-auto max-w-4xl px-6 py-14 space-y-4">
          <Link href={`/${locale}/reader`}
            className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.55)", color: "var(--text)" }}
          >
            ← {t.back}
          </Link>
          <p style={{ color: "var(--danger)", fontSize: 14 }}>{t.notFound}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen theme-soft">
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Breadcrumb */}
        <Link href={`/${locale}/reader`}
          className="inline-flex items-center gap-1 text-xs mb-8"
          style={{ color: "var(--muted)", textDecoration: "none" }}
        >
          ← {t.back}
        </Link>

        {/* Hero */}
        <section
          className="rounded-[32px] border overflow-hidden"
          style={{
            borderColor: "var(--border)",
            background: "linear-gradient(145deg, rgba(233,230,223,0.96), rgba(217,212,204,0.9))",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
            {/* Cover */}
            <div
              style={{
                aspectRatio: "2/3",
                background: "linear-gradient(145deg, rgba(94,99,87,0.18), rgba(217,212,204,0.8))",
                position: "relative", overflow: "hidden",
              }}
            >
              {coverSrc ? (
                <img src={coverSrc} alt={series.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, textAlign: "center", color: "var(--text)" }}>
                    {series.title}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: "32px 32px 32px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {typeLabel && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 9999,
                    background: "rgba(94,99,87,0.12)", border: "1px solid rgba(47,47,47,0.12)",
                    color: "var(--accent)",
                  }}>
                    {typeLabel}
                  </span>
                )}
                {series.language && (
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 9999,
                    background: "rgba(255,255,255,0.5)", border: "1px solid rgba(47,47,47,0.1)",
                    color: "var(--muted)",
                  }}>
                    {series.language.toUpperCase()}
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text)", lineHeight: 1.2 }}>
                {series.title}
              </h1>

              {series.description && (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)", maxWidth: 500 }}>
                  {series.description}
                </p>
              )}

              {/* Creator */}
              {creator && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(94,99,87,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>
                        {(creator.display_name || creator.username || "?")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <Link
                      href={creator.username ? `/${locale}/creator/${creator.username}` : "#"}
                      style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
                    >
                      {creator.display_name || creator.username || "Creator"}
                    </Link>
                    <p style={{ fontSize: 11, color: "var(--muted)" }}>
                      {followerCount.toLocaleString()} {t.followers}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)" }}>
                <span>{chapters.length} {t.chapters}</span>
              </div>

              {/* Owner actions */}
              {isOwner && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                  <button
                    onClick={handleTogglePublishSeries}
                    style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(194,120,0,0.45)", background: "rgba(194,120,0,0.08)", color: "#8a5500", cursor: "pointer" }}
                  >
                    {series.published ? "Unpublish Series" : "Publish Series"}
                  </button>
                  <button
                    onClick={handleDeleteSeries}
                    style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(185,28,28,0.4)", background: "rgba(185,28,28,0.07)", color: "#b01c1c", cursor: "pointer" }}
                  >
                    Delete Series
                  </button>
                </div>
              )}

              {/* CTAs */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                {progressChapter ? (
                  <>
                    <Link
                      href={`/${locale}/reader/series/${seriesId}/${progressChapter.chapter_number}`}
                      style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "11px 24px", borderRadius: 9999, fontWeight: 700,
                        fontSize: 13, background: "var(--accent)", color: "#f8f7f3",
                        textDecoration: "none",
                      }}
                    >
                      {t.continueReading} · Ch.{progressChapter.chapter_number}
                    </Link>
                    {chapters[0] && (
                      <Link
                        href={`/${locale}/reader/series/${seriesId}/${chapters[0].chapter_number}`}
                        style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "11px 24px", borderRadius: 9999, fontWeight: 600,
                          fontSize: 13, background: "rgba(255,255,255,0.6)",
                          border: "1px solid rgba(47,47,47,0.12)", color: "var(--text)",
                          textDecoration: "none",
                        }}
                      >
                        {t.startReading}
                      </Link>
                    )}
                  </>
                ) : chapters[0] ? (
                  <Link
                    href={`/${locale}/reader/series/${seriesId}/${chapters[0].chapter_number}`}
                    style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "11px 28px", borderRadius: 9999, fontWeight: 700,
                      fontSize: 13, background: "var(--accent)", color: "#f8f7f3",
                      textDecoration: "none",
                    }}
                  >
                    {t.startReading}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Chapter list */}
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 16 }}>
            {t.chapters}
          </h2>

          {chapters.length === 0 ? (
            <div
              className="rounded-[20px] border p-5"
              style={{ borderColor: "var(--border)", background: "rgba(233,230,223,0.6)", color: "var(--muted)", fontSize: 13 }}
            >
              {t.noChapters}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {chapters.map((ch, i) => {
                const isProgress = ch.id === progressChapterId;
                return (
                  <div
                    key={ch.id}
                    style={{
                      display: "flex", alignItems: "center",
                      borderRadius: 16,
                      border: isProgress ? "1px solid rgba(94,99,87,0.3)" : "1px solid rgba(47,47,47,0.1)",
                      background: isProgress ? "rgba(94,99,87,0.1)" : i % 2 === 0 ? "rgba(233,230,223,0.7)" : "rgba(255,255,255,0.5)",
                      overflow: "hidden",
                    }}
                  >
                    <Link
                      href={`/${locale}/reader/series/${seriesId}/${ch.chapter_number}`}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 20px", textDecoration: "none", transition: "opacity 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", minWidth: 32 }}>
                          {t.chapter} {ch.chapter_number}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                          {ch.title || `${t.chapter} ${ch.chapter_number}`}
                        </span>
                        {isProgress && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
                            background: "rgba(94,99,87,0.15)", color: "var(--accent)",
                          }}>
                            Last read
                          </span>
                        )}
                        {isOwner && !ch.is_published && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 9999,
                            background: "rgba(194,120,0,0.12)", color: "#8a5500",
                          }}>
                            Draft
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        {new Date(ch.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    </Link>
                    {isOwner && (
                      <div style={{ display: "flex", gap: 6, paddingRight: 12, flexShrink: 0 }}>
                        <button
                          onClick={() => handleToggleChapterPublish(ch.id, !!ch.is_published)}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(194,120,0,0.45)", background: "rgba(194,120,0,0.08)", color: "#8a5500", cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          {ch.is_published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => handleDeleteChapter(ch.id)}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(185,28,28,0.4)", background: "rgba(185,28,28,0.07)", color: "#b01c1c", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
