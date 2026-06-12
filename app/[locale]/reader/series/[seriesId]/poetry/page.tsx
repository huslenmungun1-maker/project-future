"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ─── types ──────────────────────────────────────────────────── */
type StanzaFormat = { align: "left" | "center" | "right"; italic: boolean; };
type PoetryFormatting = { stanzas: StanzaFormat[]; lineSpacing: number; stanzaSpacing: number; };
type PageRow    = { id: string; chapter_id: string; page_number: number; content: string | null; formatting: PoetryFormatting | null; };
type ChapterRow = { id: string; chapter_number: number; title: string; };
type SeriesRow  = { id: string; title: string | null; cover_image_url: string | null; author_label: string | null; };

const DEFAULT_FMT: PoetryFormatting = { stanzas: [], lineSpacing: 1.8, stanzaSpacing: 2 };
const DEFAULT_STANZA: StanzaFormat  = { align: "left", italic: false };

/* ─── PoemView ───────────────────────────────────────────────── */
function PoemView({ page }: { page: PageRow }) {
  const fmt = page.formatting ?? DEFAULT_FMT;
  const rawStanzas = (page.content || "").split(/\n{2,}/).filter(s => s.trim().length > 0);

  if (rawStanzas.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${fmt.stanzaSpacing}em` }}>
      {rawStanzas.map((stanza, idx) => {
        const sfmt = fmt.stanzas[idx] ?? DEFAULT_STANZA;
        return (
          <div
            key={idx}
            style={{
              textAlign: sfmt.align,
              fontStyle: sfmt.italic ? "italic" : "normal",
              lineHeight: fmt.lineSpacing,
              whiteSpace: "pre-wrap",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 16,
              color: "#1a1a1a",
            }}
          >
            {stanza}
          </div>
        );
      })}
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────── */
export default function PoetryReaderPage() {
  const params   = useParams() as Record<string, string>;
  const locale   = params.locale || "en";
  const seriesId = params.seriesId || "";

  const [series,   setSeries]   = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [pagesMap, setPagesMap] = useState<Record<string, PageRow[]>>({});
  const [status,   setStatus]   = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: s } = await supabase
        .from("series").select("id, title, cover_image_url, author_label")
        .eq("id", seriesId).eq("published", true).maybeSingle();
      if (!alive) return;
      if (!s) { setStatus("error"); return; }
      setSeries(s as SeriesRow);

      const { data: chs } = await supabase
        .from("chapters").select("id, chapter_number, title")
        .eq("series_id", seriesId).order("chapter_number", { ascending: true });
      if (!alive) return;
      const chList = (chs as ChapterRow[]) || [];
      setChapters(chList);

      if (chList.length > 0) {
        const map: Record<string, PageRow[]> = {};
        for (const ch of chList) {
          const { data: pg } = await supabase
            .from("pages").select("id, chapter_id, page_number, content, formatting")
            .eq("chapter_id", ch.id).order("page_number", { ascending: true });
          map[ch.id] = (pg as PageRow[]) || [];
        }
        if (!alive) return;
        setPagesMap(map);
      }

      setStatus("ok");
    }
    load();
    return () => { alive = false; };
  }, [seriesId]);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>
      Loading…
    </div>
  );

  if (status === "error" || !series) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>
      Collection not found.{" "}
      <Link href={`/${locale}/reader`} style={{ color: "#666", marginLeft: 8 }}>← Browse</Link>
    </div>
  );

  const hasPoems = chapters.some(ch => (pagesMap[ch.id] || []).length > 0);

  return (
    <main style={{ minHeight: "100vh", background: "#fdf8f0", padding: "48px 0 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 28px" }}>

        {/* back */}
        <Link
          href={`/${locale}/reader/series/${seriesId}`}
          style={{ fontSize: 12, color: "#999", textDecoration: "none", display: "inline-block", marginBottom: 32 }}
        >
          ← Back
        </Link>

        {/* title block */}
        <div style={{ marginBottom: 56 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "Georgia, serif", lineHeight: 1.25 }}>
            {series.title}
          </h1>
          {series.author_label && (
            <p style={{ fontSize: 13, color: "#888", marginTop: 10, fontStyle: "italic" }}>
              {series.author_label}
            </p>
          )}
        </div>

        {/* poems by section */}
        {hasPoems ? (
          chapters.map(ch => {
            const poems = (pagesMap[ch.id] || []).filter(p => (p.content || "").trim().length > 0);
            if (poems.length === 0) return null;
            return (
              <section key={ch.id} style={{ marginBottom: 64 }}>
                <h2 style={{
                  fontSize: 11, fontWeight: 700, color: "#aaa",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  margin: "0 0 36px",
                  paddingBottom: 10,
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                }}>
                  {ch.title}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
                  {poems.map(poem => (
                    <article key={poem.id}>
                      <PoemView page={poem} />
                    </article>
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <p style={{ color: "#999", fontSize: 14 }}>No poems published yet.</p>
        )}
      </div>
    </main>
  );
}
