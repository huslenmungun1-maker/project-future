"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/* ─── constants ──────────────────────────────────────────────── */
const BG      = "#111113";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT     = "#eceae4";
const MUTED   = "#7a7870";
const ACCENT  = "#b6a07c";
const SUCCESS = "#6ea880";

const PAGE_ASPECT: Record<string, number> = {
  A4: 297 / 210, A5: 210 / 148, Paperback: 8.5 / 5.5, Letter: 11 / 8.5,
};

const FONT_OPTIONS = [
  { value: "Georgia, serif",              label: "Georgia" },
  { value: "'Merriweather', serif",       label: "Merriweather" },
  { value: "'Playfair Display', serif",   label: "Playfair Display" },
  { value: "'Lora', serif",               label: "Lora" },
  { value: "system-ui, sans-serif",       label: "System UI" },
];

const PAGE_BG_PRESETS = [
  { value: "#ffffff", label: "White" },
  { value: "#fdf8f0", label: "Cream" },
  { value: "#f5f0e8", label: "Parchment" },
  { value: "#1a1a1a", label: "Dark" },
];

/* ─── types ──────────────────────────────────────────────────── */
type BookStyles = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textColor: string;
  pageBackground: string;
  marginH: number;
  marginV: number;
  pageNumbers: "off" | "bottom-center" | "bottom-left" | "bottom-right";
};

type TextBlock = {
  id: string;
  type: "title" | "subtitle" | "author";
  text: string;
  x: number; // % of canvas width
  y: number; // % of canvas height
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
};

type CoverDesign = {
  backgroundColor: string;
  useSeriesCover: boolean;
  blocks: TextBlock[];
};

type PageRow    = { id: string; chapter_id: string; page_number: number; content: string | null; };
type ChapterRow = { id: string; chapter_number: number; title: string; };
type SeriesRow  = {
  id: string; title: string; cover_image_url: string | null;
  page_size: string | null; published: boolean;
  book_styles: BookStyles | null; cover_design: CoverDesign | null;
};

const DEFAULT_STYLES: BookStyles = {
  fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.8,
  textColor: "#1a1a1a", pageBackground: "#ffffff",
  marginH: 72, marginV: 72, pageNumbers: "bottom-center",
};

const DEFAULT_COVER: CoverDesign = {
  backgroundColor: "#1a2a3a", useSeriesCover: true,
  blocks: [
    { id: "title",    type: "title",    text: "Book Title",  x: 50, y: 35, fontSize: 32, color: "#ffffff", align: "center", bold: true },
    { id: "subtitle", type: "subtitle", text: "A subtitle",  x: 50, y: 50, fontSize: 16, color: "#cccccc", align: "center", bold: false },
    { id: "author",   type: "author",   text: "Author Name", x: 50, y: 80, fontSize: 14, color: "#aaaaaa", align: "center", bold: false },
  ],
};

/* ─── PageCanvas ─────────────────────────────────────────────── */
function PageCanvas({
  page, styles, aspect, pageNum,
  onSave,
}: {
  page: PageRow; styles: BookStyles; aspect: number; pageNum: number;
  onSave: (id: string, html: string) => void;
}) {
  const divRef  = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (divRef.current && !focused.current) {
      divRef.current.innerHTML = page.content || "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  function exec(cmd: string, val?: string) { divRef.current?.focus(); document.execCommand(cmd, false, val); }

  const toolBtn: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`,
    borderRadius: 5, color: TEXT, cursor: "pointer", fontSize: 11, padding: "3px 7px",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => exec("bold")} style={toolBtn}><b>B</b></button>
        <button onClick={() => exec("italic")} style={toolBtn}><i style={{ fontStyle: "italic" }}>I</i></button>
        <span style={{ width: 1, height: 14, background: BORDER, margin: "0 2px" }} />
        <button onClick={() => exec("justifyLeft")} style={toolBtn}>⬱</button>
        <button onClick={() => exec("justifyCenter")} style={toolBtn}>☰</button>
        <button onClick={() => exec("justifyRight")} style={toolBtn}>⬰</button>
        <span style={{ width: 1, height: 14, background: BORDER, margin: "0 2px" }} />
        <select onChange={e => exec("fontSize", e.target.value)} defaultValue="3"
          style={{ fontSize: 11, borderRadius: 5, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT, padding: "2px 5px" }}>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
        </select>
        <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>Page {pageNum}</span>
      </div>

      <div style={{
        background: styles.pageBackground,
        boxShadow: "0 8px 48px rgba(0,0,0,0.55)",
        borderRadius: 2,
        aspectRatio: `1 / ${aspect}`,
        position: "relative",
        overflow: "hidden",
      }}>
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => { focused.current = true; }}
          onBlur={e => { focused.current = false; onSave(page.id, e.currentTarget.innerHTML); }}
          style={{
            padding: `${styles.marginV}px ${styles.marginH}px`,
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
            color: styles.textColor,
            minHeight: "100%",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {styles.pageNumbers !== "off" && (
          <div style={{
            position: "absolute", bottom: 20,
            left: styles.pageNumbers === "bottom-left" ? styles.marginH : styles.pageNumbers === "bottom-right" ? undefined : "50%",
            right: styles.pageNumbers === "bottom-right" ? styles.marginH : undefined,
            transform: styles.pageNumbers === "bottom-center" ? "translateX(-50%)" : undefined,
            fontSize: 11, color: styles.textColor, opacity: 0.4, fontFamily: styles.fontFamily,
          }}>
            {pageNum}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CoverCanvas ────────────────────────────────────────────── */
function CoverCanvas({
  cover, aspect, seriesCoverUrl,
  onUpdateBlock, onSelectBlock, selectedBlockId,
}: {
  cover: CoverDesign; aspect: number; seriesCoverUrl: string | null;
  onUpdateBlock: (id: string, delta: Partial<TextBlock>) => void;
  onSelectBlock: (id: string | null) => void;
  selectedBlockId: string | null;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging  = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.current.startY) / rect.height) * 100;
    onUpdateBlock(dragging.current.id, {
      x: Math.max(5, Math.min(95, dragging.current.origX + dx)),
      y: Math.max(5, Math.min(95, dragging.current.origY + dy)),
    });
  }

  function onMouseUp() { dragging.current = null; }

  const bgStyle: React.CSSProperties = cover.useSeriesCover && seriesCoverUrl
    ? { backgroundImage: `url(${seriesCoverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: cover.backgroundColor };

  return (
    <div
      ref={canvasRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={() => onSelectBlock(null)}
      style={{
        ...bgStyle,
        boxShadow: "0 8px 48px rgba(0,0,0,0.55)",
        borderRadius: 2,
        aspectRatio: `1 / ${aspect}`,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        userSelect: "none",
      }}
    >
      {cover.blocks.map(block => (
        <div
          key={block.id}
          contentEditable
          suppressContentEditableWarning
          onClick={e => e.stopPropagation()}
          onMouseDown={e => {
            e.stopPropagation();
            onSelectBlock(block.id);
            dragging.current = { id: block.id, startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y };
          }}
          onBlur={e => onUpdateBlock(block.id, { text: e.currentTarget.innerText })}
          style={{
            position: "absolute",
            left: `${block.x}%`, top: `${block.y}%`,
            transform: "translate(-50%, -50%)",
            cursor: "grab",
            fontSize: block.fontSize,
            color: block.color,
            fontWeight: block.bold ? 700 : 400,
            textAlign: block.align,
            padding: "4px 8px",
            outline: selectedBlockId === block.id ? "2px dashed rgba(255,255,255,0.6)" : "none",
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            maxWidth: "80%",
          }}
        >
          {block.text}
        </div>
      ))}
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
export default function BookEditorPage() {
  const params  = useParams();
  const router  = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const locale   = (params?.locale as string) || "en";
  const seriesId = (params?.id as string) || "";

  const [series,   setSeries]   = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [pagesMap, setPagesMap] = useState<Record<string, PageRow[]>>({});
  const [status,   setStatus]   = useState<"loading" | "ok" | "error">("loading");

  const [view,    setView]    = useState<"cover" | "page">("cover");
  const [selChId, setSelChId] = useState<string | null>(null);
  const [selPgId, setSelPgId] = useState<string | null>(null);

  const [bookStyles,  setBookStyles]  = useState<BookStyles>(DEFAULT_STYLES);
  const [coverDesign, setCoverDesign] = useState<CoverDesign>(DEFAULT_COVER);
  const [selBlockId,  setSelBlockId]  = useState<string | null>(null);

  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState<string | null>(null);
  const [addingPg,    setAddingPg]    = useState(false);
  const [addingCh,    setAddingCh]    = useState(false);
  const [rightPanel,  setRightPanel]  = useState<"styles" | "cover">("styles");

  /* ── load ── */
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session?.user) { router.replace(`/${locale}/login`); return; }

      const { data: s } = await supabase
        .from("series")
        .select("id, title, cover_image_url, page_size, published, book_styles, cover_design")
        .eq("id", seriesId).eq("user_id", session.user.id).maybeSingle();
      if (!alive) return;
      if (!s) { setStatus("error"); return; }

      const row = s as SeriesRow;
      setSeries(row);
      if (row.book_styles) setBookStyles(row.book_styles);
      if (row.cover_design) setCoverDesign(row.cover_design);

      const { data: chs } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true });
      if (!alive) return;
      const chList = (chs as ChapterRow[]) || [];
      setChapters(chList);

      if (chList.length > 0) {
        const allPgs: Record<string, PageRow[]> = {};
        for (const ch of chList) {
          const { data: pg } = await supabase
            .from("pages").select("id, chapter_id, page_number, content")
            .eq("chapter_id", ch.id).order("page_number", { ascending: true });
          allPgs[ch.id] = (pg as PageRow[]) || [];
        }
        if (!alive) return;
        setPagesMap(allPgs);
      }

      setStatus("ok");
    }
    load();
    return () => { alive = false; };
  }, [seriesId, locale, router, supabase]);

  /* ── save styles + cover ── */
  async function saveBookData() {
    if (!series || saving) return;
    setSaving(true);
    const { error } = await supabase.from("series").update({
      book_styles: bookStyles,
      cover_design: coverDesign,
    }).eq("id", series.id);
    setSaving(false);
    setSaveMsg(error ? "Save failed" : "Saved ✓");
    setTimeout(() => setSaveMsg(null), 2000);
  }

  /* ── page ops ── */
  async function addPage(chapterId: string) {
    if (addingPg) return;
    setAddingPg(true);
    const existing = pagesMap[chapterId] || [];
    const nextNum = existing.length > 0 ? Math.max(...existing.map(p => p.page_number)) + 1 : 1;
    const { data } = await supabase
      .from("pages").insert({ chapter_id: chapterId, page_number: nextNum, content: "" })
      .select("id, chapter_id, page_number, content").maybeSingle();
    if (data) {
      setPagesMap(prev => ({ ...prev, [chapterId]: [...(prev[chapterId] || []), data as PageRow] }));
      setSelChId(chapterId);
      setSelPgId((data as PageRow).id);
      setView("page");
    }
    setAddingPg(false);
  }

  async function deletePage(chapterId: string, pageId: string) {
    if (!window.confirm("Delete this page?")) return;
    await supabase.from("pages").delete().eq("id", pageId);
    setPagesMap(prev => ({ ...prev, [chapterId]: (prev[chapterId] || []).filter(p => p.id !== pageId) }));
    if (selPgId === pageId) { setSelPgId(null); setView("cover"); }
  }

  async function savePage(pageId: string, html: string) {
    await supabase.from("pages").update({ content: html }).eq("id", pageId);
    setPagesMap(prev => {
      const next = { ...prev };
      for (const chId of Object.keys(next)) {
        next[chId] = next[chId].map(p => p.id === pageId ? { ...p, content: html } : p);
      }
      return next;
    });
  }

  /* ── chapter ops ── */
  async function addChapter() {
    if (addingCh) return;
    setAddingCh(true);
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;
    const { data } = await supabase
      .from("chapters").insert({ series_id: seriesId, chapter_number: nextNum, title: `Chapter ${nextNum}`, content: null, is_published: false })
      .select("id, chapter_number, title").maybeSingle();
    if (data) {
      const ch = data as ChapterRow;
      setChapters(prev => [...prev, ch]);
      setPagesMap(prev => ({ ...prev, [ch.id]: [] }));
    }
    setAddingCh(false);
  }

  /* ── cover design helpers ── */
  const updateBlock = useCallback((id: string, delta: Partial<TextBlock>) => {
    setCoverDesign(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, ...delta } : b),
    }));
  }, []);

  /* ── computed ── */
  const aspect   = PAGE_ASPECT[series?.page_size ?? "A4"] ?? (297 / 210);
  const selPage  = selChId && selPgId ? (pagesMap[selChId] || []).find(p => p.id === selPgId) : null;
  const selBlock = coverDesign.blocks.find(b => b.id === selBlockId) ?? null;

  // flat page counter for page numbers
  const flatPageNum = useMemo(() => {
    if (!selChId || !selPgId) return 1;
    let n = 0;
    for (const ch of chapters) {
      for (const pg of (pagesMap[ch.id] || [])) {
        n++;
        if (pg.id === selPgId) return n;
      }
    }
    return n;
  }, [chapters, pagesMap, selChId, selPgId]);

  if (status === "loading") return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>
      Loading book editor…
    </div>
  );
  if (status === "error") return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#c97a6a", fontSize: 13 }}>
      Series not found. <Link href={`/${locale}/studio`} style={{ color: MUTED, marginLeft: 8 }}>← Studio</Link>
    </div>
  );

  /* ── render ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: BG, color: TEXT, overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <Link href={`/${locale}/studio/series/${seriesId}`} style={{ fontSize: 12, color: MUTED, textDecoration: "none", padding: "5px 12px", borderRadius: 9999, border: `1px solid ${BORDER}` }}>
          ← {series?.title}
        </Link>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Book Editor</span>
        <span style={{ fontSize: 11, color: saveMsg === "Saved ✓" ? SUCCESS : "#c97a6a", opacity: saveMsg ? 1 : 0, transition: "opacity 0.3s" }}>
          {saveMsg}
        </span>
        <button
          onClick={saveBookData}
          disabled={saving}
          style={{ padding: "6px 18px", borderRadius: 9999, background: ACCENT, color: "#0a0a0c", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <Link
          href={`/${locale}/reader/series/${seriesId}/book`}
          style={{ padding: "6px 14px", borderRadius: 9999, border: `1px solid rgba(110,168,128,0.3)`, background: "rgba(110,168,128,0.08)", color: SUCCESS, fontSize: 12, textDecoration: "none" }}
        >
          Preview →
        </Link>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left: chapter/page tree ── */}
        <aside style={{ width: 220, borderRight: `1px solid ${BORDER}`, overflowY: "auto", flexShrink: 0, padding: "12px 0" }}>

          {/* Cover */}
          <div
            onClick={() => { setView("cover"); setSelPgId(null); setRightPanel("cover"); }}
            style={{
              padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: view === "cover" ? "rgba(182,160,124,0.12)" : "transparent",
              color: view === "cover" ? ACCENT : TEXT,
              borderLeft: view === "cover" ? `2px solid ${ACCENT}` : "2px solid transparent",
            }}
          >
            Cover
          </div>

          <div style={{ height: 1, background: BORDER, margin: "8px 0" }} />

          {/* Chapters */}
          {chapters.map(ch => (
            <div key={ch.id}>
              <div style={{ padding: "6px 16px", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Ch.{ch.chapter_number} — {ch.title}
              </div>
              {(pagesMap[ch.id] || []).map(pg => (
                <div
                  key={pg.id}
                  style={{
                    padding: "6px 24px", cursor: "pointer", fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: selPgId === pg.id ? "rgba(182,160,124,0.1)" : "transparent",
                    color: selPgId === pg.id ? ACCENT : MUTED,
                    borderLeft: selPgId === pg.id ? `2px solid ${ACCENT}` : "2px solid transparent",
                  }}
                  onClick={() => { setView("page"); setSelChId(ch.id); setSelPgId(pg.id); setRightPanel("styles"); }}
                >
                  <span>Page {pg.page_number}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deletePage(ch.id, pg.id); }}
                    style={{ background: "none", border: "none", color: "rgba(201,122,106,0.5)", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}
                    title="Delete page"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => addPage(ch.id)}
                disabled={addingPg}
                style={{ width: "100%", textAlign: "left", padding: "5px 24px", background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}
              >
                + Add page
              </button>
            </div>
          ))}

          <div style={{ height: 1, background: BORDER, margin: "8px 0" }} />
          <button
            onClick={addChapter}
            disabled={addingCh}
            style={{ width: "100%", textAlign: "left", padding: "8px 16px", background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}
          >
            + Add chapter
          </button>
        </aside>

        {/* ── Center: canvas ── */}
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: "32px 24px", background: "#0d0d0f" }}>
          <div style={{ width: "100%", maxWidth: 520 }}>
            {view === "cover" ? (
              <CoverCanvas
                cover={coverDesign}
                aspect={aspect}
                seriesCoverUrl={series?.cover_image_url ?? null}
                onUpdateBlock={updateBlock}
                onSelectBlock={setSelBlockId}
                selectedBlockId={selBlockId}
              />
            ) : selPage ? (
              <PageCanvas
                page={selPage}
                styles={bookStyles}
                aspect={aspect}
                pageNum={flatPageNum}
                onSave={savePage}
              />
            ) : (
              <div style={{ textAlign: "center", color: MUTED, fontSize: 13, paddingTop: 80 }}>
                Select a page from the left panel, or add a chapter to start.
              </div>
            )}
          </div>
        </main>

        {/* ── Right: styles / cover design panel ── */}
        <aside style={{ width: 268, borderLeft: `1px solid ${BORDER}`, overflowY: "auto", flexShrink: 0 }}>

          {/* Panel tab */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
            {(["styles", "cover"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightPanel(tab)}
                style={{
                  flex: 1, padding: "10px 0", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                  background: rightPanel === tab ? "rgba(182,160,124,0.1)" : "transparent",
                  color: rightPanel === tab ? ACCENT : MUTED,
                  borderBottom: rightPanel === tab ? `2px solid ${ACCENT}` : "2px solid transparent",
                }}
              >
                {tab === "styles" ? "Page Styles" : "Cover Design"}
              </button>
            ))}
          </div>

          <div style={{ padding: 16 }}>

            {/* ── Page Styles ── */}
            {rightPanel === "styles" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Font family">
                  <select value={bookStyles.fontFamily} onChange={e => setBookStyles(s => ({ ...s, fontFamily: e.target.value }))} style={selectStyle}>
                    {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label={`Font size — ${bookStyles.fontSize}pt`}>
                  <input type="range" min={9} max={20} step={1} value={bookStyles.fontSize}
                    onChange={e => setBookStyles(s => ({ ...s, fontSize: Number(e.target.value) }))} style={{ width: "100%" }} />
                </Field>
                <Field label={`Line height — ${bookStyles.lineHeight}`}>
                  <input type="range" min={1.2} max={2.4} step={0.1} value={bookStyles.lineHeight}
                    onChange={e => setBookStyles(s => ({ ...s, lineHeight: Number(e.target.value) }))} style={{ width: "100%" }} />
                </Field>
                <Field label="Text color">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={bookStyles.textColor} onChange={e => setBookStyles(s => ({ ...s, textColor: e.target.value }))} style={{ width: 32, height: 28, borderRadius: 6, border: "none", cursor: "pointer" }} />
                    <span style={{ fontSize: 11, color: MUTED }}>{bookStyles.textColor}</span>
                  </div>
                </Field>
                <Field label="Page background">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {PAGE_BG_PRESETS.map(p => (
                      <button key={p.value} onClick={() => setBookStyles(s => ({ ...s, pageBackground: p.value }))}
                        title={p.label}
                        style={{ width: 28, height: 28, borderRadius: 6, background: p.value, border: bookStyles.pageBackground === p.value ? "2px solid " + ACCENT : "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }} />
                    ))}
                    <input type="color" value={bookStyles.pageBackground} onChange={e => setBookStyles(s => ({ ...s, pageBackground: e.target.value }))}
                      style={{ width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer" }} title="Custom color" />
                  </div>
                </Field>
                <Field label={`Margin H — ${bookStyles.marginH}px`}>
                  <input type="range" min={24} max={120} step={4} value={bookStyles.marginH}
                    onChange={e => setBookStyles(s => ({ ...s, marginH: Number(e.target.value) }))} style={{ width: "100%" }} />
                </Field>
                <Field label={`Margin V — ${bookStyles.marginV}px`}>
                  <input type="range" min={24} max={120} step={4} value={bookStyles.marginV}
                    onChange={e => setBookStyles(s => ({ ...s, marginV: Number(e.target.value) }))} style={{ width: "100%" }} />
                </Field>
                <Field label="Page numbers">
                  <select value={bookStyles.pageNumbers} onChange={e => setBookStyles(s => ({ ...s, pageNumbers: e.target.value as BookStyles["pageNumbers"] }))} style={selectStyle}>
                    <option value="off">Off</option>
                    <option value="bottom-center">Bottom center</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-right">Bottom right</option>
                  </select>
                </Field>
                <button onClick={() => setBookStyles(DEFAULT_STYLES)} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginTop: 4 }}>
                  Reset to defaults
                </button>
              </div>
            )}

            {/* ── Cover Design ── */}
            {rightPanel === "cover" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Background">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT, cursor: "pointer" }}>
                    <input type="checkbox" checked={coverDesign.useSeriesCover}
                      onChange={e => setCoverDesign(c => ({ ...c, useSeriesCover: e.target.checked }))} />
                    Use series cover image
                  </label>
                  {!coverDesign.useSeriesCover && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                      <input type="color" value={coverDesign.backgroundColor}
                        onChange={e => setCoverDesign(c => ({ ...c, backgroundColor: e.target.value }))}
                        style={{ width: 32, height: 28, borderRadius: 6, border: "none", cursor: "pointer" }} />
                      <span style={{ fontSize: 11, color: MUTED }}>{coverDesign.backgroundColor}</span>
                    </div>
                  )}
                </Field>

                <div style={{ height: 1, background: BORDER }} />
                <p style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Text blocks</p>
                <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Click a block on the cover to select it, then drag to reposition.</p>

                {selBlock ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="Text">
                      <input value={selBlock.text} onChange={e => updateBlock(selBlock.id, { text: e.target.value })}
                        style={{ ...inputStyle, width: "100%" }} />
                    </Field>
                    <Field label={`Size — ${selBlock.fontSize}pt`}>
                      <input type="range" min={10} max={64} step={1} value={selBlock.fontSize}
                        onChange={e => updateBlock(selBlock.id, { fontSize: Number(e.target.value) })} style={{ width: "100%" }} />
                    </Field>
                    <Field label="Color">
                      <input type="color" value={selBlock.color} onChange={e => updateBlock(selBlock.id, { color: e.target.value })}
                        style={{ width: 32, height: 28, borderRadius: 6, border: "none", cursor: "pointer" }} />
                    </Field>
                    <Field label="Alignment">
                      <div style={{ display: "flex", gap: 4 }}>
                        {(["left", "center", "right"] as const).map(a => (
                          <button key={a} onClick={() => updateBlock(selBlock.id, { align: a })}
                            style={{ flex: 1, padding: "4px 0", fontSize: 11, borderRadius: 6, border: `1px solid ${BORDER}`, background: selBlock.align === a ? ACCENT : "transparent", color: selBlock.align === a ? "#0a0a0c" : MUTED, cursor: "pointer" }}>
                            {a[0].toUpperCase() + a.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT, cursor: "pointer" }}>
                      <input type="checkbox" checked={selBlock.bold} onChange={e => updateBlock(selBlock.id, { bold: e.target.checked })} />
                      Bold
                    </label>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: MUTED }}>Click a text block on the cover to edit it.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── tiny helpers ───────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#eceae4", outline: "none",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#eceae4", outline: "none", boxSizing: "border-box",
};
