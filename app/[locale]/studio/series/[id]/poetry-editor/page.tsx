"use client";

import { useEffect, useState, useMemo } from "react";
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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── constants ──────────────────────────────────────────────── */
const BG      = "#111113";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#eceae4";
const MUTED   = "#7a7870";
const ACCENT  = "#b6a07c";
const SUCCESS = "#6ea880";

/* ─── types ──────────────────────────────────────────────────── */
type StanzaFormat = { align: "left" | "center" | "right"; italic: boolean; };

type PoetryFormatting = {
  stanzas: StanzaFormat[];
  lineSpacing: number;
  stanzaSpacing: number;
};

type PageRow = {
  id: string;
  chapter_id: string;
  page_number: number;
  content: string | null;
  formatting: PoetryFormatting | null;
};

type ChapterRow = { id: string; chapter_number: number; title: string; };
type SeriesRow  = { id: string; title: string; };

const DEFAULT_STANZA: StanzaFormat = { align: "left", italic: false };

const DEFAULT_FORMATTING: PoetryFormatting = {
  stanzas: [],
  lineSpacing: 1.8,
  stanzaSpacing: 2,
};

/* ─── SortablePoem ───────────────────────────────────────────── */
function SortablePoem({
  poem, selected, onSelect, onDelete,
}: {
  poem: PageRow; selected: boolean;
  onSelect: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: poem.id });

  const preview = (poem.content || "").split("\n")[0]?.slice(0, 38) || `Poem ${poem.page_number}`;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        padding: "6px 16px 6px 24px",
        cursor: isDragging ? "grabbing" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
        background: selected ? "rgba(182,160,124,0.1)" : "transparent",
        color: selected ? ACCENT : MUTED,
        borderLeft: selected ? `2px solid ${ACCENT}` : "2px solid transparent",
        fontSize: 12,
        userSelect: "none",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {preview}
      </span>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{ background: "none", border: "none", color: "rgba(201,122,106,0.5)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}
        title="Delete poem"
      >×</button>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
export default function PoetryEditorPage() {
  const params   = useParams();
  const router   = useRouter();
  const supabase = useMemo(() => getBrowserClient(), []);

  const locale   = (params?.locale as string) || "en";
  const seriesId = (params?.id as string) || "";

  const [series,   setSeries]   = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [pagesMap, setPagesMap] = useState<Record<string, PageRow[]>>({});
  const [status,   setStatus]   = useState<"loading" | "ok" | "error">("loading");

  const [selChId, setSelChId] = useState<string | null>(null);
  const [selPgId, setSelPgId] = useState<string | null>(null);

  const [editText,       setEditText]       = useState("");
  const [editFormatting, setEditFormatting] = useState<PoetryFormatting>(DEFAULT_FORMATTING);

  const [saveMsg,  setSaveMsg]  = useState<string | null>(null);
  const [addingPg, setAddingPg] = useState(false);
  const [addingCh, setAddingCh] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  /* ── load ── */
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session?.user) { router.replace(`/${locale}/login`); return; }

      const { data: prof } = await supabase
        .from("profiles").select("role").eq("user_id", session.user.id).maybeSingle();
      const role = (prof as { role: string } | null)?.role ?? "reader";
      if (role !== "creator" && role !== "owner" && session.user.email !== process.env.NEXT_PUBLIC_OWNER_EMAIL) {
        router.replace(`/${locale}/profile`);
        return;
      }

      const { data: s } = await supabase
        .from("series").select("id, title")
        .eq("id", seriesId).eq("user_id", session.user.id).maybeSingle();
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
        const allPgs: Record<string, PageRow[]> = {};
        for (const ch of chList) {
          const { data: pg } = await supabase
            .from("pages").select("id, chapter_id, page_number, content, formatting")
            .eq("chapter_id", ch.id).order("page_number", { ascending: true });
          allPgs[ch.id] = (pg as PageRow[]) || [];
        }
        if (!alive) return;
        setPagesMap(allPgs);
        setSelChId(chList[0].id);
      }

      setStatus("ok");
    }
    load();
    return () => { alive = false; };
  }, [seriesId, locale, router, supabase]);

  /* ── sync edit state when selection changes ── */
  useEffect(() => {
    if (!selPgId || !selChId) return;
    const page = (pagesMap[selChId] || []).find(p => p.id === selPgId);
    if (!page) return;
    setEditText(page.content || "");
    setEditFormatting(page.formatting ?? DEFAULT_FORMATTING);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selPgId]);

  /* ── stanza detection ── */
  const stanzas = useMemo(
    () => editText.split(/\n{2,}/).filter(s => s.trim().length > 0),
    [editText]
  );

  function getStanzaFmt(idx: number): StanzaFormat {
    return editFormatting.stanzas[idx] ?? DEFAULT_STANZA;
  }

  /* ── save helpers ── */
  function flash(msg: string) {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 1800);
  }

  async function saveContent(pageId: string, content: string) {
    const { error } = await supabase.from("pages").update({ content }).eq("id", pageId);
    if (error) { flash("Save failed"); return; }
    setPagesMap(prev => {
      const next = { ...prev };
      for (const chId of Object.keys(next)) {
        next[chId] = next[chId].map(p => p.id === pageId ? { ...p, content } : p);
      }
      return next;
    });
    flash("Saved ✓");
  }

  async function saveFormatting(pageId: string, formatting: PoetryFormatting) {
    const { error } = await supabase.from("pages").update({ formatting }).eq("id", pageId);
    if (!error) {
      setPagesMap(prev => {
        const next = { ...prev };
        for (const chId of Object.keys(next)) {
          next[chId] = next[chId].map(p => p.id === pageId ? { ...p, formatting } : p);
        }
        return next;
      });
    }
  }

  function updateStanza(idx: number, delta: Partial<StanzaFormat>) {
    if (!selPgId) return;
    const arr = editFormatting.stanzas.slice();
    while (arr.length <= idx) arr.push({ ...DEFAULT_STANZA });
    arr[idx] = { ...arr[idx], ...delta };
    const next = { ...editFormatting, stanzas: arr };
    setEditFormatting(next);
    saveFormatting(selPgId, next);
  }

  function updateGlobal(delta: Partial<PoetryFormatting>) {
    if (!selPgId) return;
    const next = { ...editFormatting, ...delta };
    setEditFormatting(next);
    saveFormatting(selPgId, next);
  }

  /* ── poem ops ── */
  async function addPoem(chapterId: string) {
    if (addingPg) return;
    setAddingPg(true);
    const existing = pagesMap[chapterId] || [];
    const nextNum = existing.length > 0 ? Math.max(...existing.map(p => p.page_number)) + 1 : 1;
    const { data } = await supabase
      .from("pages")
      .insert({ chapter_id: chapterId, page_number: nextNum, content: "", formatting: null })
      .select("id, chapter_id, page_number, content, formatting")
      .maybeSingle();
    if (data) {
      const newPage = data as PageRow;
      setPagesMap(prev => ({ ...prev, [chapterId]: [...(prev[chapterId] || []), newPage] }));
      setSelChId(chapterId);
      setSelPgId(newPage.id);
    }
    setAddingPg(false);
  }

  async function deletePoem(chapterId: string, pageId: string) {
    if (!window.confirm("Delete this poem?")) return;
    await supabase.from("pages").delete().eq("id", pageId);
    setPagesMap(prev => ({
      ...prev,
      [chapterId]: (prev[chapterId] || []).filter(p => p.id !== pageId),
    }));
    if (selPgId === pageId) setSelPgId(null);
  }

  /* ── chapter ops ── */
  async function addChapter() {
    if (addingCh) return;
    setAddingCh(true);
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;
    const { data } = await supabase
      .from("chapters")
      .insert({ series_id: seriesId, chapter_number: nextNum, title: `Section ${nextNum}`, content: null, is_published: false })
      .select("id, chapter_number, title")
      .maybeSingle();
    if (data) {
      const ch = data as ChapterRow;
      setChapters(prev => [...prev, ch]);
      setPagesMap(prev => ({ ...prev, [ch.id]: [] }));
      setSelChId(ch.id);
      setSelPgId(null);
    }
    setAddingCh(false);
  }

  /* ── drag-to-reorder ── */
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !selChId) return;

    const sorted = [...(pagesMap[selChId] || [])].sort((a, b) => a.page_number - b.page_number);
    const oldIdx = sorted.findIndex(p => p.id === active.id);
    const newIdx = sorted.findIndex(p => p.id === over.id);
    const reordered = arrayMove(sorted, oldIdx, newIdx).map((p, i) => ({ ...p, page_number: i + 1 }));

    setPagesMap(prev => ({ ...prev, [selChId]: reordered }));
    await Promise.all(
      reordered.map(p => supabase.from("pages").update({ page_number: p.page_number }).eq("id", p.id))
    );
  }

  /* ── computed ── */
  const selPage = selChId && selPgId
    ? (pagesMap[selChId] || []).find(p => p.id === selPgId) ?? null
    : null;

  /* ── render ── */
  if (status === "loading") return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>
      Loading poetry editor…
    </div>
  );
  if (status === "error") return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#c97a6a", fontSize: 13 }}>
      Series not found.{" "}
      <Link href={`/${locale}/studio`} style={{ color: MUTED, marginLeft: 8 }}>← Studio</Link>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: BG, color: TEXT, overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <Link
          href={`/${locale}/studio/series/${seriesId}`}
          style={{ fontSize: 12, color: MUTED, textDecoration: "none", padding: "5px 12px", borderRadius: 9999, border: `1px solid ${BORDER}` }}
        >
          ← {series?.title}
        </Link>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Poetry Editor</span>
        <span style={{
          fontSize: 11,
          color: saveMsg === "Saved ✓" ? SUCCESS : "#c97a6a",
          opacity: saveMsg ? 1 : 0,
          transition: "opacity 0.3s",
          minWidth: 60,
          textAlign: "right",
        }}>
          {saveMsg}
        </span>
        <Link
          href={`/${locale}/reader/series/${seriesId}/poetry`}
          style={{ padding: "6px 14px", borderRadius: 9999, border: `1px solid rgba(110,168,128,0.3)`, background: "rgba(110,168,128,0.08)", color: SUCCESS, fontSize: 12, textDecoration: "none" }}
        >
          Preview →
        </Link>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left: chapter/poem tree ── */}
        <aside style={{ width: 220, borderRight: `1px solid ${BORDER}`, overflowY: "auto", flexShrink: 0, padding: "12px 0" }}>
          {chapters.map(ch => {
            const isSelCh = selChId === ch.id;
            const poems = [...(pagesMap[ch.id] || [])].sort((a, b) => a.page_number - b.page_number);
            return (
              <div key={ch.id}>
                <div
                  onClick={() => { setSelChId(ch.id); setSelPgId(null); }}
                  style={{
                    padding: "6px 16px", fontSize: 11, fontWeight: 600,
                    color: isSelCh ? ACCENT : MUTED,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    cursor: "pointer",
                    borderLeft: isSelCh ? `2px solid ${ACCENT}` : "2px solid transparent",
                  }}
                >
                  Ch.{ch.chapter_number} — {ch.title}
                </div>

                {isSelCh && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={poems.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {poems.map(poem => (
                        <SortablePoem
                          key={poem.id}
                          poem={poem}
                          selected={selPgId === poem.id}
                          onSelect={() => setSelPgId(poem.id)}
                          onDelete={() => deletePoem(ch.id, poem.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                <button
                  onClick={() => { setSelChId(ch.id); addPoem(ch.id); }}
                  disabled={addingPg}
                  style={{ width: "100%", textAlign: "left", padding: "5px 24px", background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}
                >
                  + Add poem
                </button>
              </div>
            );
          })}

          <div style={{ height: 1, background: BORDER, margin: "8px 0" }} />
          <button
            onClick={addChapter}
            disabled={addingCh}
            style={{ width: "100%", textAlign: "left", padding: "8px 16px", background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}
          >
            + Add section
          </button>
        </aside>

        {/* ── Center: poem textarea ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "24px", background: "#0d0d0f" }}>
          {selPage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
              <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                Poem {selPage.page_number} — blank lines separate stanzas
              </p>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={() => { if (selPgId) saveContent(selPgId, editText); }}
                style={{
                  flex: 1,
                  minHeight: 400,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  color: TEXT,
                  fontSize: 15,
                  lineHeight: editFormatting.lineSpacing,
                  fontFamily: "Georgia, serif",
                  padding: "20px 24px",
                  outline: "none",
                  resize: "none",
                  whiteSpace: "pre-wrap",
                }}
                placeholder={"Write your poem here…\n\nLeave a blank line between stanzas."}
                spellCheck={false}
              />
            </div>
          ) : (
            <div style={{ textAlign: "center", color: MUTED, fontSize: 13, paddingTop: 80 }}>
              {chapters.length === 0
                ? "Add a section to start."
                : "Select a poem from the left panel, or add one."}
            </div>
          )}
        </main>

        {/* ── Right: formatting panel ── */}
        <aside style={{ width: 268, borderLeft: `1px solid ${BORDER}`, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: 16 }}>
            {selPage ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Global sliders */}
                <section>
                  <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
                    Poem Formatting
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label={`Line spacing — ${editFormatting.lineSpacing.toFixed(1)}`}>
                      <input
                        type="range" min={1.0} max={3.0} step={0.1}
                        value={editFormatting.lineSpacing}
                        onChange={e => updateGlobal({ lineSpacing: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </Field>
                    <Field label={`Stanza spacing — ${editFormatting.stanzaSpacing.toFixed(2)}em`}>
                      <input
                        type="range" min={0.5} max={5} step={0.25}
                        value={editFormatting.stanzaSpacing}
                        onChange={e => updateGlobal({ stanzaSpacing: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </Field>
                  </div>
                </section>

                <div style={{ height: 1, background: BORDER }} />

                {/* Per-stanza controls */}
                {stanzas.length > 0 ? (
                  <section>
                    <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>
                      Stanzas ({stanzas.length})
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {stanzas.map((stanza, idx) => {
                        const fmt = getStanzaFmt(idx);
                        const preview = stanza.split("\n")[0]?.slice(0, 30) || `Stanza ${idx + 1}`;
                        return (
                          <div
                            key={idx}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: `1px solid ${BORDER}`,
                              borderRadius: 8,
                              padding: "10px 12px",
                            }}
                          >
                            <p style={{ fontSize: 10, color: MUTED, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {preview}
                            </p>
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                              {(["left", "center", "right"] as const).map(a => (
                                <button
                                  key={a}
                                  onClick={() => updateStanza(idx, { align: a })}
                                  style={{
                                    flex: 1, padding: "4px 0", fontSize: 10, borderRadius: 5,
                                    border: `1px solid ${BORDER}`,
                                    background: fmt.align === a ? ACCENT : "transparent",
                                    color: fmt.align === a ? "#0a0a0c" : MUTED,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  {a === "left" ? "L" : a === "center" ? "C" : "R"}
                                </button>
                              ))}
                              <button
                                onClick={() => updateStanza(idx, { italic: !fmt.italic })}
                                style={{
                                  padding: "4px 10px", fontSize: 12, borderRadius: 5,
                                  border: `1px solid ${BORDER}`,
                                  background: fmt.italic ? ACCENT : "transparent",
                                  color: fmt.italic ? "#0a0a0c" : MUTED,
                                  cursor: "pointer",
                                  fontStyle: "italic",
                                  fontFamily: "Georgia, serif",
                                  fontWeight: 600,
                                }}
                              >
                                I
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>
                    No stanzas detected. Type your poem in the center panel. Separate stanzas with a blank line.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: MUTED }}>
                Select a poem to format it.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
