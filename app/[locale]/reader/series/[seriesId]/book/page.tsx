"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ─── constants ──────────────────────────────────────────────── */
const PAGE_ASPECT: Record<string, number> = {
  A4: 297 / 210, A5: 210 / 148, Paperback: 8.5 / 5.5, Letter: 11 / 8.5,
};

type BookStyles = {
  fontFamily: string; fontSize: number; lineHeight: number;
  textColor: string; pageBackground: string;
  marginH: number; marginV: number;
  pageNumbers: "off" | "bottom-center" | "bottom-left" | "bottom-right";
};

type TextBlock = {
  id: string; type: string; text: string;
  x: number; y: number; fontSize: number;
  color: string; align: "left" | "center" | "right"; bold: boolean;
};

type CoverDesign = {
  backgroundColor: string; useSeriesCover: boolean; blocks: TextBlock[];
};

type SeriesRow = {
  id: string; title: string | null; cover_image_url: string | null;
  page_size: string | null; price: number | null;
  book_styles: BookStyles | null; cover_design: CoverDesign | null;
};

type PageRow = { id: string; chapter_id: string; page_number: number; content: string | null; };
type ChapterRow = { id: string; chapter_number: number; title: string; };

const DEFAULT_STYLES: BookStyles = {
  fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.8,
  textColor: "#1a1a1a", pageBackground: "#ffffff",
  marginH: 72, marginV: 72, pageNumbers: "bottom-center",
};

/* ─── component ──────────────────────────────────────────────── */
export default function BookReaderPage() {
  const params   = useParams() as Record<string, string>;
  const locale   = params.locale || "en";
  const seriesId = params.seriesId || "";

  const [series,   setSeries]   = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [pagesMap, setPagesMap] = useState<Record<string, PageRow[]>>({});
  const [status,   setStatus]   = useState<"loading" | "ok" | "error">("loading");

  // current spread index (0 = cover, 1+ = page pairs)
  const [spread,   setSpread]   = useState(0);
  const [dir,      setDir]      = useState<"fwd" | "bwd">("fwd");
  const [animKey,  setAnimKey]  = useState(0);

  // resume + progress
  const [userId,     setUserId]     = useState<string | null>(null);
  const [resumeFrom, setResumeFrom] = useState<number | null>(null);

  // search
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: s } = await supabase
        .from("series")
        .select("id, title, cover_image_url, page_size, price, book_styles, cover_design")
        .eq("id", seriesId).maybeSingle();
      if (!alive) return;
      if (!s) { setStatus("error"); return; }

      const row = s as SeriesRow;
      setSeries(row);

      const { data: chs } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true });
      if (!alive) return;
      const chList = (chs as ChapterRow[]) || [];
      setChapters(chList);

      const map: Record<string, PageRow[]> = {};
      for (const ch of chList) {
        const { data: pg } = await supabase
          .from("pages").select("id, chapter_id, page_number, content")
          .eq("chapter_id", ch.id).order("page_number", { ascending: true });
        map[ch.id] = (pg as PageRow[]) || [];
      }
      if (!alive) return;
      setPagesMap(map);
      setStatus("ok");
    }
    load();
    return () => { alive = false; };
  }, [seriesId]);

  // Load auth + progress on mount
  useEffect(() => {
    let alive = true;
    async function loadProgress() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      setUserId(user.id);
      const { data: prog } = await supabase
        .from("reading_progress")
        .select("last_page")
        .eq("user_id", user.id)
        .eq("content_id", seriesId)
        .maybeSingle();
      if (alive && prog && prog.last_page > 0) setResumeFrom(prog.last_page);
    }
    loadProgress();
    return () => { alive = false; };
  }, [seriesId]);

  // Debounced progress save on spread change
  useEffect(() => {
    if (!userId || spread === 0) return;
    const t = setTimeout(() => {
      supabase.from("reading_progress").upsert(
        { user_id: userId, content_id: seriesId, content_type: "book_spread", last_page: spread, updated_at: new Date().toISOString() },
        { onConflict: "user_id,content_id" }
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [spread, userId, seriesId]);

  // flatten all pages in reading order
  const allPages = useMemo<PageRow[]>(() => {
    const out: PageRow[] = [];
    for (const ch of chapters) {
      for (const pg of (pagesMap[ch.id] || [])) out.push(pg);
    }
    return out;
  }, [chapters, pagesMap]);

  // Search — page number, chapter title, body text (all in memory)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || !searchOpen) return [];
    if (/^\d+$/.test(q)) {
      const pageNum = parseInt(q, 10);
      if (pageNum >= 1 && pageNum <= allPages.length) {
        const targetSpread = 1 + Math.floor((pageNum - 1) / 2);
        return [{ key: "pn", label: `Jump to page ${pageNum}`, targetSpread }];
      }
      return [];
    }
    const lower = q.toLowerCase();
    const out: { key: string; label: string; targetSpread: number }[] = [];
    for (const ch of chapters) {
      if (ch.title?.toLowerCase().includes(lower)) {
        const idx = allPages.findIndex(p => p.chapter_id === ch.id);
        out.push({ key: `ch-${ch.id}`, label: `Ch. ${ch.chapter_number}: ${ch.title}`, targetSpread: idx >= 0 ? 1 + Math.floor(idx / 2) : 1 });
      }
    }
    for (let i = 0; i < allPages.length && out.length < 20; i++) {
      const raw = allPages[i].content || "";
      const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const mi = text.toLowerCase().indexOf(lower);
      if (mi >= 0) {
        const s = Math.max(0, mi - 28), e = Math.min(text.length, mi + q.length + 28);
        const snippet = (s > 0 ? "…" : "") + text.slice(s, e) + (e < text.length ? "…" : "");
        out.push({ key: `pg-${allPages[i].id}`, label: `Page ${i + 1}: ${snippet}`, targetSpread: 1 + Math.floor(i / 2) });
      }
    }
    return out;
  }, [searchQuery, searchOpen, allPages, chapters]);

  const totalSpreads = 1 + Math.ceil(allPages.length / 2); // spread 0 = cover

  function navigate(delta: 1 | -1) {
    const next = spread + delta;
    if (next < 0 || next >= totalSpreads) return;
    setDir(delta > 0 ? "fwd" : "bwd");
    setSpread(next);
    setAnimKey(k => k + 1);
  }

  const styles: BookStyles = series?.book_styles ?? DEFAULT_STYLES;
  const cover: CoverDesign | null = series?.cover_design ?? null;
  const aspect = PAGE_ASPECT[series?.page_size ?? "A4"] ?? (297 / 210);

  // pages in current spread (body pages start at spread 1)
  const spreadPages = spread === 0 ? [] : (() => {
    const base = (spread - 1) * 2;
    return [allPages[base], allPages[base + 1]].filter(Boolean);
  })();

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7870", fontSize: 13 }}>
      Loading…
    </div>
  );

  if (status === "error" || !series) return (
    <div style={{ minHeight: "100vh", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <span style={{ color: "#c97a6a", fontSize: 14 }}>Book not found.</span>
      <Link href={`/${locale}/reader`} style={{ color: "#7a7870", fontSize: 13 }}>← Browse</Link>
    </div>
  );

  const bgCoverStyle: React.CSSProperties = cover?.useSeriesCover && series.cover_image_url
    ? { backgroundImage: `url(${series.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: cover?.backgroundColor ?? "#1a2a3a" };

  return (
    <div style={{ minHeight: "100vh", background: "#111", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes flipFwd { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes flipBwd { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
        .flip-fwd { animation: flipFwd 0.28s cubic-bezier(.22,.61,.36,1); }
        .flip-bwd { animation: flipBwd 0.28s cubic-bezier(.22,.61,.36,1); }
      `}</style>

      {/* Search overlay */}
      {searchOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}
        >
          <div style={{ width: "min(520px, 92vw)", background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setSearchOpen(false); }}
              placeholder="Page number, chapter name, or text…"
              style={{ width: "100%", padding: "14px 18px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#eceae4", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            {searchResults.length === 0 && searchQuery.trim() && (
              <p style={{ padding: "14px 18px", fontSize: 13, color: "#5e5e6e" }}>No results.</p>
            )}
            {!searchQuery.trim() && (
              <p style={{ padding: "14px 18px", fontSize: 12, color: "#5e5e6e" }}>Type a page number, chapter name, or any text you remember.</p>
            )}
            {searchResults.map(r => (
              <button key={r.key} onClick={() => { setSpread(r.targetSpread); setAnimKey(k => k + 1); setSearchOpen(false); setSearchQuery(""); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 18px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#eceae4", fontSize: 13, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resume banner */}
      {resumeFrom !== null && spread === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "10px 20px", background: "rgba(182,160,124,0.12)", borderBottom: "1px solid rgba(182,160,124,0.2)", fontSize: 13 }}>
          <span style={{ color: "#eceae4" }}>Resume from page {(resumeFrom - 1) * 2 + 1}?</span>
          <button onClick={() => { setSpread(resumeFrom); setDir("fwd"); setAnimKey(k => k + 1); setResumeFrom(null); }}
            style={{ padding: "4px 14px", borderRadius: 9999, background: "#b6a07c", border: "none", color: "#0a0a0c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Resume
          </button>
          <button onClick={() => setResumeFrom(null)}
            style={{ padding: "4px 14px", borderRadius: 9999, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#7a7870", fontSize: 12, cursor: "pointer" }}>
            Start over
          </button>
        </div>
      )}

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d0f" }}>
        <Link href={`/${locale}/reader/series/${seriesId}`} style={{ fontSize: 12, color: "#7a7870", textDecoration: "none" }}>←</Link>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#eceae4", flex: 1 }}>{series.title}</span>
        {series.price != null && series.price > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 9999, background: "rgba(94,99,87,0.85)", color: "#f8f7f3" }}>
            Buy — ${series.price.toFixed(2)}
          </span>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 9999, background: "rgba(110,168,128,0.15)", color: "#6ea880" }}>
            Free
          </span>
        )}
        <span style={{ fontSize: 11, color: "#7a7870" }}>
          {spread === 0 ? "Cover" : `Pages ${(spread - 1) * 2 + 1}–${Math.min((spread - 1) * 2 + 2, allPages.length)} of ${allPages.length}`}
        </span>
        <button onClick={() => setSearchOpen(true)}
          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#7a7870", cursor: "pointer" }}>
          ⌕ Search
        </button>
      </div>

      {/* page area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", position: "relative" }}>

        {/* prev arrow */}
        <button
          onClick={() => navigate(-1)}
          disabled={spread === 0}
          style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)", color: "#eceae4", fontSize: 18,
            cursor: spread === 0 ? "not-allowed" : "pointer", opacity: spread === 0 ? 0.2 : 0.8, zIndex: 10,
          }}
        >
          ‹
        </button>

        {/* canvas */}
        <div
          key={animKey}
          className={dir === "fwd" ? "flip-fwd" : "flip-bwd"}
          style={{ display: "flex", gap: 2, alignItems: "flex-start", maxWidth: "100%" }}
        >
          {spread === 0 ? (
            /* Cover */
            <div style={{ width: "min(380px, 90vw)", aspectRatio: `1 / ${aspect}`, ...bgCoverStyle, boxShadow: "0 12px 60px rgba(0,0,0,0.7)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
              {cover?.blocks.map(block => (
                <div key={block.id} style={{
                  position: "absolute",
                  left: `${block.x}%`, top: `${block.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: block.fontSize, color: block.color,
                  fontWeight: block.bold ? 700 : 400,
                  textAlign: block.align,
                  pointerEvents: "none",
                  maxWidth: "80%",
                  whiteSpace: "pre-wrap",
                }}>
                  {block.text}
                </div>
              ))}
            </div>
          ) : (
            /* Body pages — two-up on desktop, one on mobile */
            <>
              {spreadPages.map((pg, i) => {
                const pageNum = (spread - 1) * 2 + i + 1;
                return (
                  <PageView
                    key={pg.id}
                    page={pg}
                    styles={styles}
                    aspect={aspect}
                    pageNum={pageNum}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* next arrow */}
        <button
          onClick={() => navigate(1)}
          disabled={spread >= totalSpreads - 1}
          style={{
            position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)", color: "#eceae4", fontSize: 18,
            cursor: spread >= totalSpreads - 1 ? "not-allowed" : "pointer",
            opacity: spread >= totalSpreads - 1 ? 0.2 : 0.8, zIndex: 10,
          }}
        >
          ›
        </button>
      </div>

      {/* Chapter TOC bar at bottom */}
      {chapters.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0d0d0f", padding: "8px 20px", display: "flex", gap: 8, overflowX: "auto" }}>
          <button onClick={() => { setSpread(0); setDir("bwd"); setAnimKey(k => k + 1); }}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#7a7870", cursor: "pointer", whiteSpace: "nowrap" }}>
            Cover
          </button>
          {chapters.map(ch => {
            const firstPgIdx = allPages.findIndex(p => p.chapter_id === ch.id);
            const targetSpread = firstPgIdx >= 0 ? 1 + Math.floor(firstPgIdx / 2) : 1;
            return (
              <button
                key={ch.id}
                onClick={() => { setSpread(targetSpread); setDir("fwd"); setAnimKey(k => k + 1); }}
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#7a7870", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Ch.{ch.chapter_number} {ch.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── single page view ───────────────────────────────────────── */
function PageView({ page, styles, aspect, pageNum }: { page: PageRow; styles: BookStyles; aspect: number; pageNum: number; }) {
  // Match the editor's 520px page width so the same HTML renders identically.
  // 47vw keeps two pages side-by-side on large screens and scales down gracefully;
  // minHeight (not height) ensures content is never clipped even if it wraps more
  // at narrower viewports.
  const minH = `calc(min(520px, 47vw) * ${aspect})`;
  return (
    <div style={{
      width: "min(520px, 47vw)",
      minHeight: minH,
      background: styles.pageBackground,
      boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
      borderRadius: 2,
      position: "relative",
      flexShrink: 0,
    }}>
      <div
        style={{
          padding: `${styles.marginV}px ${styles.marginH}px`,
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          lineHeight: styles.lineHeight,
          color: styles.textColor,
          boxSizing: "border-box",
        }}
        dangerouslySetInnerHTML={{ __html: page.content || "" }}
      />
      {styles.pageNumbers !== "off" && (
        <div style={{
          position: "absolute", bottom: 16,
          left: styles.pageNumbers === "bottom-left" ? styles.marginH : styles.pageNumbers === "bottom-right" ? undefined : "50%",
          right: styles.pageNumbers === "bottom-right" ? styles.marginH : undefined,
          transform: styles.pageNumbers === "bottom-center" ? "translateX(-50%)" : undefined,
          fontSize: 10, color: styles.textColor, opacity: 0.35,
          fontFamily: styles.fontFamily,
        }}>
          {pageNum}
        </div>
      )}
    </div>
  );
}
