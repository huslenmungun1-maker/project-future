"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import ChapterPagesEditor from "@/components/studio/ChapterPagesEditor";

const BG = "#0a0a0c";
const SURFACE = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#eceae4";
const MUTED = "#7a7870";
const ACCENT = "#b6a07c";
const DANGER = "#c97a6a";
const SUCCESS = "#6ea880";

type ChapterRow = {
  id: string;
  series_id: string;
  title: string;
  chapter_number: number;
  content: string | null;
  is_published: boolean | null;
  scheduled_at: string | null;
  created_at: string;
  price: number | null;
};

type SeriesRow = {
  id: string;
  title: string;
  project_type: string | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ChapterEditorPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);

  const locale = (params?.locale as string) || "en";
  const seriesId = (params?.id as string) || "";
  const chapterId = (params?.chapterId as string) || "";

  const [loadStatus, setLoadStatus] = useState<"loading" | "ok" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"text" | "pages">("text");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [price, setPrice] = useState<string>("0");

  const backHref = `/${locale}/studio/series/${seriesId}`;

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!seriesId || !chapterId) {
        if (alive) { setLoadError("Missing series or chapter ID."); setLoadStatus("error"); }
        return;
      }

      const { data: { session }, error: authErr } = await supabase.auth.getSession();
      if (!alive) return;
      if (authErr || !session?.user) { router.replace(`/${locale}/login`); return; }

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (!alive) return;

      const role = profile?.role ?? "reader";
      if (role !== "creator" && role !== "owner" && session.user.email !== process.env.NEXT_PUBLIC_OWNER_EMAIL) { router.replace(`/${locale}/profile`); return; }

      const { data: s } = await supabase
        .from("series").select("id, title, project_type")
        .eq("id", seriesId).eq("user_id", session.user.id).maybeSingle();
      if (!alive) return;

      if (!s) {
        setLoadError("Series not found or access denied.");
        setLoadStatus("error");
        return;
      }

      const { data: c, error: cErr } = await supabase
        .from("chapters")
        .select("id, series_id, title, chapter_number, content, is_published, scheduled_at, created_at, price")
        .eq("id", chapterId).eq("series_id", seriesId).maybeSingle();
      if (!alive) return;

      if (cErr || !c) {
        setLoadError(cErr?.message || "Chapter not found.");
        setLoadStatus("error");
        return;
      }

      const row = c as ChapterRow;
      setSeries(s as SeriesRow);
      setChapter(row);
      setTitle(row.title || "");
      setContent(row.content || "");
      setIsPublished(Boolean(row.is_published));
      setScheduledAt(row.scheduled_at ? row.scheduled_at.slice(0, 16) : "");
      setPrice(String(row.price ?? 0));
      setLoadStatus("ok");
    }

    load();
    return () => { alive = false; };
  }, [seriesId, chapterId, locale, router, supabase]);

  async function handleSave() {
    if (!chapter || saveStatus === "saving") return;

    setSaveStatus("saving");
    setSaveError(null);

    const titleTrim = title.trim() || "Untitled";
    const contentTrim = content.trim() || null;

    const parsedPrice = Math.max(0, parseFloat(price) || 0);

    const { data, error: saveErr } = await supabase
      .from("chapters")
      .update({
        title: titleTrim,
        content: contentTrim,
        is_published: isPublished,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        price: parsedPrice,
      })
      .eq("id", chapter.id)
      .select("id, series_id, title, chapter_number, content, is_published, scheduled_at, created_at, price")
      .maybeSingle();

    if (saveErr || !data) {
      setSaveError(saveErr?.message || "Save failed.");
      setSaveStatus("error");
      return;
    }

    await supabase
      .from("chapter_translations")
      .upsert(
        { chapter_id: chapter.id, locale, title: titleTrim, script: contentTrim },
        { onConflict: "chapter_id,locale" }
      );

    const saved = data as ChapterRow;
    setChapter(saved);
    setPrice(String(saved.price ?? 0));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  if (loadStatus === "loading") {
    return (
      <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <p style={{ color: MUTED, fontSize: 13 }}>Loading chapter…</p>
        </div>
      </main>
    );
  }

  if (loadStatus === "error" || !chapter) {
    return (
      <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <Link
            href={backHref}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: MUTED, fontSize: 12, textDecoration: "none",
              marginBottom: 20,
            }}
          >
            ← Back to series
          </Link>
          <div
            style={{
              background: "rgba(201,122,106,0.08)",
              border: `1px solid rgba(201,122,106,0.2)`,
              borderRadius: 16, padding: "16px 20px",
              color: DANGER, fontSize: 13,
            }}
          >
            {loadError || "Chapter not found."}
          </div>
        </div>
      </main>
    );
  }

  const statusLabel = isPublished ? "Live" : "Draft";
  const statusColor = isPublished ? SUCCESS : MUTED;

  return (
    <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: 12, color: MUTED }}>
          <Link href={`/${locale}/studio`} style={{ color: MUTED, textDecoration: "none" }}>
            Studio
          </Link>
          <span>/</span>
          <Link href={backHref} style={{ color: MUTED, textDecoration: "none" }}>
            {series?.title || "Series"}
          </Link>
          <span>/</span>
          <span style={{ color: TEXT }}>Chapter {chapter.chapter_number}</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", margin: 0 }}>
              Chapter {chapter.chapter_number}
            </h1>
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 9999, border: `1px solid rgba(255,255,255,0.1)`,
                background: isPublished ? "rgba(110,168,128,0.1)" : "rgba(255,255,255,0.05)",
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <Link
            href={backHref}
            style={{
              fontSize: 12, color: MUTED, textDecoration: "none",
              padding: "6px 14px", borderRadius: 9999,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
            }}
          >
            ← Back to series
          </Link>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 20, alignItems: "start" }}>

          {/* Editor column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Title */}
            <div
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`,
                borderRadius: 16, padding: "20px 24px",
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Chapter title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chapter title…"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`, borderRadius: 10,
                  padding: "10px 14px", fontSize: 15, fontWeight: 600,
                  color: TEXT, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Tab switcher: Text vs Pages (for manga/comic/webtoon) */}
            {(series?.project_type === "manga" || series?.project_type === "webtoon" || series?.project_type === "comic") && (
              <div style={{ display: "flex", gap: 4, padding: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
                {(["text", "pages"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 9, fontWeight: 600,
                      fontSize: 12, border: "none", cursor: "pointer", transition: "all 0.15s",
                      background: activeTab === tab ? ACCENT : "transparent",
                      color: activeTab === tab ? "#0a0a0c" : MUTED,
                    }}
                  >
                    {tab === "text" ? "Script" : "Pages"}
                  </button>
                ))}
              </div>
            )}

            {/* Content: text tab */}
            {activeTab === "text" && (
            <div
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`,
                borderRadius: 16, padding: "20px 24px",
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {series?.project_type === "manga" || series?.project_type === "webtoon" || series?.project_type === "comic" ? "Script / Notes" : "Content"}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your story here…"
                rows={28}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`, borderRadius: 10,
                  padding: "14px", fontSize: 14, lineHeight: 1.8,
                  color: TEXT, outline: "none", resize: "vertical",
                  boxSizing: "border-box", fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: MUTED }}>
                  {content.length.toLocaleString()} characters
                </span>
              </div>
            </div>
            )}

            {/* Pages tab */}
            {activeTab === "pages" && chapter && (
              <ChapterPagesEditor chapterId={chapter.id} />
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Save card */}
            <div
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`,
                borderRadius: 16, padding: "20px",
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 16 }}>Publish settings</p>

              {/* Publish toggle */}
              <label
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, cursor: "pointer", padding: "12px 14px",
                  background: "rgba(255,255,255,0.02)", borderRadius: 10,
                  border: `1px solid ${BORDER}`, marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                    {isPublished ? "Published" : "Draft"}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {isPublished ? "Visible to readers" : "Only you can see this"}
                  </div>
                </div>
                <div
                  onClick={() => setIsPublished((v) => !v)}
                  style={{
                    width: 40, height: 22, borderRadius: 11,
                    background: isPublished ? ACCENT : "rgba(255,255,255,0.1)",
                    position: "relative", transition: "background 0.2s", flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      position: "absolute", top: 3,
                      left: isPublished ? 21 : 3,
                      width: 16, height: 16, borderRadius: "50%",
                      background: isPublished ? "#0a0a0c" : "#eceae4",
                      transition: "left 0.2s",
                    }}
                  />
                </div>
              </label>

              {/* Schedule */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Schedule publish
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${BORDER}`, borderRadius: 10,
                    padding: "8px 12px", fontSize: 12, color: TEXT,
                    outline: "none", boxSizing: "border-box",
                    colorScheme: "dark",
                  }}
                />
                {scheduledAt && (
                  <p style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
                    Will auto-publish on {new Date(scheduledAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Price */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Price (USD)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: MUTED, pointerEvents: "none" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${BORDER}`, borderRadius: 10,
                      padding: "8px 12px 8px 24px", fontSize: 13, color: TEXT,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
                <p style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
                  {parseFloat(price) > 0 ? `Readers pay $${parseFloat(price).toFixed(2)} · you earn $${(parseFloat(price) * 0.85).toFixed(2)}` : "Free — anyone can read"}
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                style={{
                  width: "100%", padding: "11px 0",
                  background: saveStatus === "saved" ? "rgba(110,168,128,0.15)" : ACCENT,
                  color: saveStatus === "saved" ? SUCCESS : "#0a0a0c",
                  border: saveStatus === "saved" ? `1px solid rgba(110,168,128,0.3)` : "none",
                  borderRadius: 9999, fontSize: 13, fontWeight: 700,
                  cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
                  opacity: saveStatus === "saving" ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save chapter"}
              </button>

              {saveError && (
                <p style={{ fontSize: 11, color: DANGER, marginTop: 8 }}>{saveError}</p>
              )}
            </div>

            {/* Meta card */}
            <div
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`,
                borderRadius: 16, padding: "18px 20px",
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Details
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: MUTED }}>Chapter</span>
                  <span style={{ color: TEXT }}>#{chapter.chapter_number}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: MUTED }}>Series</span>
                  <span style={{ color: TEXT, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {series?.title || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: MUTED }}>Created</span>
                  <span style={{ color: TEXT }}>
                    {new Date(chapter.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: MUTED }}>Status</span>
                  <span style={{ color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                </div>
              </div>
            </div>

            {/* Reader preview link */}
            {isPublished && (
              <Link
                href={`/${locale}/reader/series/${seriesId}/${chapter.chapter_number}`}
                style={{
                  display: "block", textAlign: "center",
                  padding: "10px 0", borderRadius: 9999,
                  border: `1px solid rgba(110,168,128,0.25)`,
                  background: "rgba(110,168,128,0.06)",
                  color: SUCCESS, fontSize: 12, fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View in reader
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
