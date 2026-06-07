"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/browserClient";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ── constants ───────────────────────────────────────────────────── */
const BG      = "#111113";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#eceae4";
const MUTED   = "#7a7870";
const ACCENT  = "#b6a07c";
const DANGER  = "#c97a6a";
const SUCCESS = "#6ea880";
const BUCKET  = "chapter-pages";

/* ── types ───────────────────────────────────────────────────────── */
type SeriesRow  = { id: string; title: string; project_type: string; };
type ChapterRow = { id: string; chapter_number: number; title: string; is_published: boolean; published_at: string | null; price: number | null; };
type PageRow    = { id: string; order_index: number; image_url: string; };

/* ── SortablePage ─────────────────────────────────────────────────── */
function SortablePage({
  page, index, onDelete, onPreview,
}: {
  page: PageRow; index: number;
  onDelete: (p: PageRow) => void;
  onPreview: (i: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {/* thumbnail — click opens lightbox */}
      <div
        style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}
        onClick={() => onPreview(index)}
      >
        <img
          src={page.image_url}
          alt={`Page ${index + 1}`}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
        />
        <div style={{
          position: "absolute", bottom: 4, left: 4,
          fontSize: 9, fontWeight: 700, color: "#fff",
          background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "1px 5px",
        }}>
          {index + 1}
        </div>
      </div>

      {/* delete — stop propagation so dnd-kit doesn't start drag */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete(page); }}
        title="Delete page"
        style={{
          position: "absolute", top: 4, right: 4,
          width: 20, height: 20, borderRadius: "50%",
          background: "rgba(201,122,106,0.88)", border: "none",
          color: "#fff", fontSize: 10, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ── Lightbox ─────────────────────────────────────────────────────── */
function Lightbox({ pages, index, onClose }: { pages: PageRow[]; index: number; onClose: () => void; }) {
  const [cur, setCur] = useState(index);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowRight")  setCur(c => Math.min(c + 1, pages.length - 1));
      if (e.key === "ArrowLeft")   setCur(c => Math.max(c - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pages.length]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {cur > 0 && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setCur(c => c - 1); }}
          style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: `1px solid rgba(255,255,255,0.15)`, color: TEXT, fontSize: 22, cursor: "pointer" }}
        >‹</button>
      )}

      <img
        src={pages[cur].image_url}
        alt={`Page ${cur + 1}`}
        onClick={e => e.stopPropagation()}
        draggable={false}
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 4, boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}
      />

      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
        {cur + 1} / {pages.length}
      </div>

      {cur < pages.length - 1 && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setCur(c => c + 1); }}
          style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: `1px solid rgba(255,255,255,0.15)`, color: TEXT, fontSize: 22, cursor: "pointer" }}
        >›</button>
      )}

      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: `1px solid rgba(255,255,255,0.15)`, color: TEXT, fontSize: 16, cursor: "pointer" }}
      >✕</button>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────── */
export default function MangaEditorPage() {
  const params   = useParams();
  const router   = useRouter();
  const locale   = (params?.locale as string) || "en";
  const seriesId = (params?.id    as string) || "";

  const supabase = useMemo(() => getBrowserClient(), []);

  const [series,       setSeries]       = useState<SeriesRow | null>(null);
  const [chapters,     setChapters]     = useState<ChapterRow[]>([]);
  const [status,       setStatus]       = useState<"loading" | "ok" | "error">("loading");

  const [selChId,      setSelChId]      = useState<string | null>(null);
  const [pages,        setPages]        = useState<PageRow[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pageCounts,   setPageCounts]   = useState<Record<string, number>>({});

  const [uploading,    setUploading]    = useState(false);
  const [uploadProg,   setUploadProg]   = useState<{ done: number; total: number } | null>(null);
  const [uploadErr,    setUploadErr]    = useState<string | null>(null);
  const [dragOver,     setDragOver]     = useState(false);

  const [lightboxIdx,  setLightboxIdx]  = useState<number | null>(null);

  // right-panel chapter metadata
  const [metaTitle,     setMetaTitle]     = useState("");
  const [metaNumber,    setMetaNumber]    = useState(1);
  const [metaPublished, setMetaPublished] = useState(false);
  const [metaPrice,     setMetaPrice]     = useState("");
  const [savingMeta,    setSavingMeta]    = useState(false);
  const [metaMsg,       setMetaMsg]       = useState<string | null>(null);

  const [addingCh, setAddingCh] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  /* ── load series + chapters ── */
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session?.user) { router.replace(`/${locale}/login`); return; }

      const { data: s } = await supabase
        .from("series").select("id, title, project_type")
        .eq("id", seriesId).eq("user_id", session.user.id).maybeSingle();
      if (!alive) return;
      if (!s) { setStatus("error"); return; }
      setSeries(s as SeriesRow);

      const { data: chs } = await supabase
        .from("chapters")
        .select("id, chapter_number, title, is_published, published_at, price")
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true });
      if (!alive) return;

      const list = (chs as ChapterRow[]) || [];
      setChapters(list);
      if (list.length > 0) openChapter(list[0]);
      setStatus("ok");
    }
    load();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  /* ── page counts for sidebar badges ── */
  useEffect(() => {
    if (chapters.length === 0) return;
    let alive = true;
    const ids = chapters.map(c => c.id);
    async function loadCounts() {
      const { data } = await supabase.from("chapter_pages").select("chapter_id").in("chapter_id", ids);
      if (!alive || !data) return;
      const counts: Record<string, number> = {};
      for (const row of data as { chapter_id: string }[]) {
        counts[row.chapter_id] = (counts[row.chapter_id] || 0) + 1;
      }
      setPageCounts(counts);
    }
    loadCounts();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters]);

  /* keep sidebar count in sync with live pages state */
  useEffect(() => {
    if (!selChId) return;
    setPageCounts(prev => ({ ...prev, [selChId]: pages.length }));
  }, [pages, selChId]);

  /* ── open chapter ── */
  function openChapter(ch: ChapterRow) {
    setSelChId(ch.id);
    setMetaTitle(ch.title || "");
    setMetaNumber(ch.chapter_number);
    setMetaPublished(ch.is_published ?? false);
    setMetaPrice(ch.price != null ? String(ch.price) : "");
    setUploadErr(null);
    setMetaMsg(null);
    loadPagesFor(ch.id);
  }

  async function loadPagesFor(chapterId: string) {
    setPagesLoading(true);
    const { data } = await supabase
      .from("chapter_pages").select("id, order_index, image_url")
      .eq("chapter_id", chapterId).order("order_index", { ascending: true });
    setPages((data as PageRow[]) || []);
    setPagesLoading(false);
  }

  /* ── upload ── */
  async function handleUpload(files: File[]) {
    if (!selChId || !files.length || uploading) return;
    setUploading(true);
    setUploadErr(null);
    setUploadProg({ done: 0, total: files.length });

    const nextIndex = pages.length > 0 ? Math.max(...pages.map(p => p.order_index)) + 1 : 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext  = file.name.split(".").pop() || "jpg";
      const path = `chapters/${selChId}/${Date.now()}_${i}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET).upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type });
      if (upErr) { setUploadErr(upErr.message); break; }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) { setUploadErr("Could not get public URL"); break; }

      const { data: row, error: insErr } = await supabase
        .from("chapter_pages")
        .insert({ chapter_id: selChId, order_index: nextIndex + i, image_url: url })
        .select("id, order_index, image_url").maybeSingle();
      if (insErr || !row) { setUploadErr(insErr?.message || "Insert failed"); break; }

      setPages(prev => [...prev, row as PageRow]);
      setUploadProg({ done: i + 1, total: files.length });
    }

    setUploading(false);
    setUploadProg(null);
  }

  /* ── delete ── */
  const handleDelete = useCallback(async (page: PageRow) => {
    if (!confirm("Delete this page?")) return;
    const pathMatch = page.image_url.split(`${BUCKET}/`)[1];
    if (pathMatch) await supabase.storage.from(BUCKET).remove([pathMatch]);
    await supabase.from("chapter_pages").delete().eq("id", page.id);
    setPages(prev => prev.filter(p => p.id !== page.id));
  }, [supabase]);

  /* ── drag-to-reorder ── */
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sorted  = [...pages].sort((a, b) => a.order_index - b.order_index);
    const oldIdx  = sorted.findIndex(p => p.id === active.id);
    const newIdx  = sorted.findIndex(p => p.id === over.id);
    const reordered = arrayMove(sorted, oldIdx, newIdx).map((p, i) => ({ ...p, order_index: i }));

    setPages(reordered); // optimistic

    await Promise.all(
      reordered.map(p => supabase.from("chapter_pages").update({ order_index: p.order_index }).eq("id", p.id))
    );
  }

  /* ── add chapter ── */
  async function addChapter() {
    if (addingCh) return;
    setAddingCh(true);
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;
    const { data } = await supabase
      .from("chapters")
      .insert({ series_id: seriesId, chapter_number: nextNum, title: `Chapter ${nextNum}`, is_published: false, content: null })
      .select("id, chapter_number, title, is_published, published_at, price").maybeSingle();
    if (data) {
      const ch = data as ChapterRow;
      setChapters(prev => [...prev, ch]);
      openChapter(ch);
    }
    setAddingCh(false);
  }

  /* ── save chapter metadata ── */
  async function saveMeta() {
    if (!selChId) return;
    setSavingMeta(true);
    setMetaMsg(null);
    const price = metaPrice.trim() !== "" ? parseFloat(metaPrice) : null;
    const existingCh = chapters.find(c => c.id === selChId);
    const publishedAt = metaPublished
      ? (existingCh?.published_at ?? new Date().toISOString())
      : null;

    const { error } = await supabase.from("chapters").update({
      title:          metaTitle.trim() || null,
      chapter_number: metaNumber,
      is_published:   metaPublished,
      published_at:   publishedAt,
      price:          price != null && !isNaN(price) ? price : null,
    }).eq("id", selChId);

    setSavingMeta(false);
    if (error) { setMetaMsg("Save failed"); return; }

    setChapters(prev => prev.map(ch => ch.id === selChId
      ? { ...ch, title: metaTitle.trim() || "", chapter_number: metaNumber, is_published: metaPublished, published_at: publishedAt, price: price ?? null }
      : ch
    ));
    setMetaMsg("Saved ✓");
    setTimeout(() => setMetaMsg(null), 2000);
  }

  /* ── derived ── */
  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.order_index - b.order_index),
    [pages]
  );

  /* ── render guards ── */
  if (status === "loading") return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>
      Loading…
    </div>
  );
  if (status === "error" || !series) return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <span style={{ color: DANGER, fontSize: 14 }}>Series not found.</span>
      <Link href={`/${locale}/studio`} style={{ color: MUTED, fontSize: 13 }}>← Studio</Link>
    </div>
  );

  const uploadLabel = uploading
    ? (uploadProg ? `Uploading ${uploadProg.done}/${uploadProg.total}…` : "Uploading…")
    : "Upload Pages";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: BG, color: TEXT, overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <Link
          href={`/${locale}/studio/series/${seriesId}`}
          style={{ fontSize: 12, color: MUTED, textDecoration: "none", padding: "5px 12px", borderRadius: 9999, border: `1px solid ${BORDER}` }}
        >
          ← {series.title}
        </Link>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
          Manga Editor
          <span style={{ fontSize: 11, fontWeight: 400, color: MUTED, marginLeft: 8, textTransform: "capitalize" }}>{series.project_type}</span>
        </span>
        {chapters.length > 0 && (
          <Link
            href={`/${locale}/reader/series/${seriesId}/${chapters[0].chapter_number}`}
            style={{ padding: "6px 14px", borderRadius: 9999, border: "1px solid rgba(110,168,128,0.3)", background: "rgba(110,168,128,0.08)", color: SUCCESS, fontSize: 12, textDecoration: "none" }}
          >
            Preview →
          </Link>
        )}
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT: chapter list ── */}
        <aside style={{ width: 220, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Chapters
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {chapters.length === 0 && (
              <p style={{ padding: "16px 14px", fontSize: 12, color: MUTED }}>No chapters yet.</p>
            )}
            {chapters.map(ch => {
              const count  = selChId === ch.id ? pages.length : (pageCounts[ch.id] ?? 0);
              const active = selChId === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => openChapter(ch)}
                  style={{
                    padding: "9px 14px", cursor: "pointer",
                    borderLeft: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                    background: active ? "rgba(182,160,124,0.08)" : "transparent",
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? ACCENT : TEXT, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Ch.{ch.chapter_number}{ch.title ? ` — ${ch.title}` : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: MUTED }}>{count} pg</span>
                    {ch.is_published && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: SUCCESS, background: "rgba(110,168,128,0.12)", borderRadius: 3, padding: "1px 4px" }}>LIVE</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 12, borderTop: `1px solid ${BORDER}` }}>
            <button
              onClick={addChapter}
              disabled={addingCh}
              style={{ width: "100%", padding: "8px 0", borderRadius: 8, background: "rgba(182,160,124,0.1)", border: `1px solid rgba(182,160,124,0.2)`, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: addingCh ? "not-allowed" : "pointer", opacity: addingCh ? 0.5 : 1 }}
            >
              {addingCh ? "Adding…" : "+ Add Chapter"}
            </button>
          </div>
        </aside>

        {/* ── CENTER: page grid ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", background: "#0d0d0f" }}>
          {!selChId ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>
              Select or add a chapter to start.
            </div>
          ) : (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Upload zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false);
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                  if (files.length) handleUpload(files);
                }}
                style={{
                  border: `2px dashed ${dragOver ? ACCENT : BORDER}`,
                  borderRadius: 12, padding: "18px 22px",
                  background: dragOver ? "rgba(182,160,124,0.05)" : "transparent",
                  transition: "border-color 0.15s, background 0.15s",
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 18px", borderRadius: 9999,
                  background: uploading ? "rgba(182,160,124,0.3)" : ACCENT,
                  color: "#0a0a0c", fontSize: 12, fontWeight: 700,
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.7 : 1, flexShrink: 0,
                }}>
                  <input
                    type="file" accept="image/*" multiple disabled={uploading}
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      if (files.length) handleUpload(files);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                  {uploadLabel}
                </label>
                <span style={{ fontSize: 12, color: MUTED }}>
                  {dragOver ? "Drop to upload" : "or drag & drop images here · JPG, PNG, WebP"}
                </span>
                {uploadErr && (
                  <span style={{ fontSize: 11, color: DANGER, marginLeft: "auto" }}>{uploadErr}</span>
                )}
              </div>

              {/* Grid */}
              {pagesLoading ? (
                <div style={{ color: MUTED, fontSize: 13 }}>Loading pages…</div>
              ) : sortedPages.length === 0 ? (
                <div style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "60px 0" }}>
                  No pages yet — upload images above.
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedPages.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                      {sortedPages.map((page, i) => (
                        <SortablePage
                          key={page.id}
                          page={page}
                          index={i}
                          onDelete={handleDelete}
                          onPreview={setLightboxIdx}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}
        </main>

        {/* ── RIGHT: chapter metadata ── */}
        <aside style={{ width: 256, borderLeft: `1px solid ${BORDER}`, overflowY: "auto", flexShrink: 0, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {!selChId ? (
            <p style={{ fontSize: 12, color: MUTED }}>Select a chapter to edit its details.</p>
          ) : (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Chapter Details</p>

              <RField label="Title">
                <input
                  value={metaTitle}
                  onChange={e => setMetaTitle(e.target.value)}
                  placeholder="Chapter title…"
                  style={inputStyle}
                />
              </RField>

              <RField label="Chapter #">
                <input
                  type="number" min={1}
                  value={metaNumber}
                  onChange={e => setMetaNumber(Number(e.target.value))}
                  style={inputStyle}
                />
              </RField>

              <RField label="Price (USD)">
                <input
                  type="number" min={0} step={0.5}
                  value={metaPrice}
                  onChange={e => setMetaPrice(e.target.value)}
                  placeholder="Free"
                  style={inputStyle}
                />
              </RField>

              <RField label="Published">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div
                    onClick={() => setMetaPublished(v => !v)}
                    style={{
                      width: 36, height: 20, borderRadius: 10,
                      background: metaPublished ? SUCCESS : "rgba(255,255,255,0.12)",
                      position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 2, left: metaPublished ? 18 : 2,
                      width: 16, height: 16, borderRadius: "50%",
                      background: "#fff", transition: "left 0.2s",
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: TEXT }}>{metaPublished ? "Live" : "Draft"}</span>
                </label>
              </RField>

              <button
                onClick={saveMeta}
                disabled={savingMeta}
                style={{
                  padding: "9px 0", borderRadius: 8, border: "none",
                  background: savingMeta ? "rgba(182,160,124,0.4)" : ACCENT,
                  color: "#0a0a0c", fontSize: 12, fontWeight: 700,
                  cursor: savingMeta ? "not-allowed" : "pointer",
                  opacity: savingMeta ? 0.7 : 1, marginTop: 4,
                }}
              >
                {savingMeta ? "Saving…" : "Save Chapter"}
              </button>

              {metaMsg && (
                <p style={{ fontSize: 11, color: metaMsg.includes("✓") ? SUCCESS : DANGER, margin: 0 }}>{metaMsg}</p>
              )}

              <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />

              <p style={{ fontSize: 10, color: MUTED, margin: 0, lineHeight: 1.5 }}>
                Drag thumbnails to reorder. Click a thumbnail to preview full-size.
              </p>
            </>
          )}
        </aside>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <Lightbox pages={sortedPages} index={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}

/* ── tiny helpers ────────────────────────────────────────────────── */
function RField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8, padding: "7px 10px",
  fontSize: 12, color: "#eceae4",
  outline: "none", boxSizing: "border-box", width: "100%",
};
