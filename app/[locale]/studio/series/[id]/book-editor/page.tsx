"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/browserClient";

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

// Intro-page block canvas: smart alignment guides (Figma/PowerPoint-style)
// snap a dragged block's edges/center to the page's edges/center or
// another block's edges/center, within this many px. Editor-only —
// guide lines are computed at render time, never part of saved content.
const SNAP_PX = 7;

// Canonical physical page size in px @96dpi — used only for pagination
// math, independent of whatever width the on-screen canvas happens to
// render at, so page breaks are deterministic regardless of viewport.
const PAGE_SIZE_PX: Record<string, { width: number; height: number }> = {
  A4:        { width: 793.7, height: 1122.5 },
  A5:        { width: 559.4, height: 793.7  },
  Paperback: { width: 528,   height: 816    },
  Letter:    { width: 816,   height: 1056   },
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
  type: "title" | "subtitle" | "author" | "text";
  // Plain text for Cover Design blocks (read/written as innerText).
  // Intro-page blocks (see PageCanvas) treat this as inline HTML instead —
  // a <span style="..."> for each differently-styled run within the
  // block, so a single block can mix fonts/sizes/colors mid-string.
  text: string;
  x: number; // % of canvas width
  y: number; // % of canvas height
  fontSize: number;
  fontFamily?: string; // falls back to the book's font when unset
  rotation?: number;   // degrees, falls back to 0
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
};

type CoverDesign = {
  backgroundColor: string;
  useSeriesCover: boolean;
  blocks: TextBlock[];
};

// A chapter intro page (pages.page_number === 0) stores this shape, as
// JSON, in the same `content` column regular pages use for HTML — same
// TextBlock model the Cover Design tab uses, just page-local instead of
// series-level.
type IntroDesign = { blocks: TextBlock[] };

type PageRow    = { id: string; chapter_id: string; page_number: number; content: string | null; };
type ChapterRow = { id: string; chapter_number: number; title: string; };
type SeriesRow  = {
  id: string; title: string; cover_image_url: string | null;
  page_size: string | null; published: boolean;
  book_styles: BookStyles | null; cover_design: CoverDesign | null;
};

const DEFAULT_STYLES: BookStyles = {
  fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 2,
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
  page, styles, pageSizeKey, pageNum,
  onSave,
  introBlocks, selIntroBlockId, onSelectIntroBlock, onUpdateIntroBlock, onCommitIntroBlocks, onEditIntroBlock, onAddIntroBlock,
}: {
  page: PageRow; styles: BookStyles; pageSizeKey: string; pageNum: number;
  onSave: (id: string, html: string) => void;
  introBlocks?: TextBlock[] | null;
  selIntroBlockId?: string | null;
  onSelectIntroBlock?: (id: string | null) => void;
  onUpdateIntroBlock?: (id: string, delta: Partial<TextBlock>) => void;
  onCommitIntroBlocks?: () => void;
  onEditIntroBlock?: (id: string, delta: Partial<TextBlock>) => void;
  onAddIntroBlock?: () => void;
}) {
  const divRef  = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef  = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [guide, setGuide] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Intro-block rich text: each block is its own contentEditable node, kept
  // in a ref map (not React children) so typing/selection never fights a
  // React re-render — same reasoning as the single-page divRef below, just
  // for a dynamic list. focusedBlockId tracks which one is actively being
  // edited so the sync effect never clobbers live typing.
  const blockEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const focusedBlockId = useRef<string | null>(null);
  // Selection captured just before a toolbar control (a <select> or
  // <input type=color>) steals focus natively, so the formatting command
  // still has something to apply to once that control's onChange fires.
  const savedRange   = useRef<Range | null>(null);
  const savedBlockId = useRef<string | null>(null);

  const box = PAGE_SIZE_PX[pageSizeKey] ?? PAGE_SIZE_PX.A4;
  const isIntro = page.page_number === 0;

  // Render the page at its true physical px size (same reference used for
  // pagination math) and scale it visually to fit the available width —
  // like a print-preview zoom. This keeps what fits on-screen identical
  // to what the pagination logic decided fits, regardless of viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / box.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box.width]);

  useEffect(() => {
    if (!isIntro && divRef.current && !focused.current) {
      divRef.current.innerHTML = page.content || "";
    }
  }, [page.id, page.content, isIntro]);

  // Sync each intro block's rendered HTML from state — except the one
  // currently being typed into, which owns its own DOM until it blurs.
  useEffect(() => {
    if (!isIntro) return;
    for (const block of introBlocks || []) {
      if (block.id === focusedBlockId.current) continue;
      const el = blockEls.current.get(block.id);
      if (el && el.innerHTML !== block.text) el.innerHTML = block.text;
    }
  }, [introBlocks, isIntro]);

  function exec(cmd: string, val?: string) { divRef.current?.focus(); document.execCommand(cmd, false, val); }

  // Rich-text-on-selection helpers (intro blocks only) — bold/font/color
  // apply via execCommand (robust across selections that cross existing
  // <span> boundaries); font size doesn't have a reliable px-accurate
  // execCommand, so it's a manual Range wrap instead.
  function execOnSelection(cmd: string, val?: string) {
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, val);
  }
  function applyFontSizeToSelection(px: number) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = `${px}px`;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }
  // Call on mousedown of any toolbar control that will steal focus
  // natively (a <select>, an <input type=color>) — captures the live
  // selection before that happens. Buttons don't need this (their own
  // mousedown already preventDefaults, so focus/selection never moves).
  function captureSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && focusedBlockId.current) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
      savedBlockId.current = focusedBlockId.current;
    }
  }
  // Re-focuses the target block, restores its saved selection (or just
  // uses the live one, if focus never left), runs the formatting command,
  // then saves the block's resulting HTML directly — a blur→save won't
  // fire here since a <select>/color-input interaction already blurred
  // the block before its onChange runs.
  function applyToSelection(fn: () => void) {
    const blockId = savedBlockId.current ?? focusedBlockId.current;
    if (!blockId) return;
    const el = blockEls.current.get(blockId);
    if (!el) return;
    el.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    fn();
    onEditIntroBlock?.(blockId, { text: el.innerHTML });
    savedRange.current = null;
    savedBlockId.current = null;
  }

  // Smart alignment guides: snaps the dragged block's left/center/right
  // (and top/center/bottom) to the page's edges/center or another
  // block's edges/center, within SNAP_PX — same idea as Figma/PowerPoint.
  // Works in real px via getBoundingClientRect/offsetWidth so it accounts
  // for each block's actual rendered size, not just its stored x/y.
  function computeSmartSnap(
    draggedEl: HTMLElement, boxRect: DOMRect, rawXPct: number, rawYPct: number,
    others: HTMLElement[]
  ): { x: number; y: number; guideX: number | null; guideY: number | null } {
    const dw = draggedEl.offsetWidth, dh = draggedEl.offsetHeight;
    const rawCx = (rawXPct / 100) * boxRect.width;
    const rawCy = (rawYPct / 100) * boxRect.height;

    const targetsX = [0, boxRect.width / 2, boxRect.width];
    const targetsY = [0, boxRect.height / 2, boxRect.height];
    for (const el of others) {
      const r = el.getBoundingClientRect();
      const left = r.left - boxRect.left, right = r.right - boxRect.left;
      const top = r.top - boxRect.top, bottom = r.bottom - boxRect.top;
      targetsX.push(left, (left + right) / 2, right);
      targetsY.push(top, (top + bottom) / 2, bottom);
    }

    let bestX = rawCx, bestDX = SNAP_PX, guideXpx: number | null = null;
    for (const t of targetsX) {
      for (const off of [-dw / 2, 0, dw / 2]) {
        const candidate = t - off;
        const d = Math.abs(rawCx - candidate);
        if (d < bestDX) { bestDX = d; bestX = candidate; guideXpx = t; }
      }
    }
    let bestY = rawCy, bestDY = SNAP_PX, guideYpx: number | null = null;
    for (const t of targetsY) {
      for (const off of [-dh / 2, 0, dh / 2]) {
        const candidate = t - off;
        const d = Math.abs(rawCy - candidate);
        if (d < bestDY) { bestDY = d; bestY = candidate; guideYpx = t; }
      }
    }

    return {
      x: (bestX / boxRect.width) * 100,
      y: (bestY / boxRect.height) * 100,
      guideX: guideXpx !== null ? (guideXpx / boxRect.width) * 100 : null,
      guideY: guideYpx !== null ? (guideYpx / boxRect.height) * 100 : null,
    };
  }

  function onBlockMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !boxRef.current || !onUpdateIntroBlock) return;
    const rect = boxRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.current.startY) / rect.height) * 100;
    const rawX = Math.max(2, Math.min(98, dragging.current.origX + dx));
    const rawY = Math.max(2, Math.min(98, dragging.current.origY + dy));

    const draggedEl = blockEls.current.get(dragging.current.id);
    const others = (introBlocks || [])
      .filter(b => b.id !== dragging.current!.id)
      .map(b => blockEls.current.get(b.id))
      .filter((el): el is HTMLDivElement => !!el);

    if (draggedEl) {
      const snap = computeSmartSnap(draggedEl, rect, rawX, rawY, others);
      setGuide({ x: snap.guideX, y: snap.guideY });
      onUpdateIntroBlock(dragging.current.id, { x: snap.x, y: snap.y });
    } else {
      onUpdateIntroBlock(dragging.current.id, { x: rawX, y: rawY });
    }
  }
  function onBlockMouseUp() {
    if (dragging.current) { dragging.current = null; setGuide({ x: null, y: null }); onCommitIntroBlocks?.(); }
  }

  const toolBtn: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`,
    borderRadius: 5, color: TEXT, cursor: "pointer", fontSize: 11, padding: "3px 7px",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        {isIntro ? (
          <>
            <button onClick={onAddIntroBlock} style={toolBtn}>+ Add text block</button>
            <span style={{ width: 1, height: 14, background: BORDER, margin: "0 2px" }} />
            <span style={{ fontSize: 10, color: MUTED }}>Selection:</span>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => applyToSelection(() => execOnSelection("bold"))}
              style={toolBtn}
            ><b>B</b></button>
            <select
              onMouseDown={captureSelection}
              onChange={e => applyToSelection(() => execOnSelection("fontName", e.target.value))}
              defaultValue=""
              style={{ fontSize: 11, borderRadius: 5, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT, padding: "2px 5px" }}
            >
              <option value="" disabled>Font…</option>
              {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              onMouseDown={captureSelection}
              onChange={e => applyToSelection(() => applyFontSizeToSelection(Number(e.target.value)))}
              defaultValue=""
              style={{ fontSize: 11, borderRadius: 5, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT, padding: "2px 5px" }}
            >
              <option value="" disabled>Size…</option>
              {[10, 12, 14, 16, 18, 24, 32, 48, 64, 96].map(s => <option key={s} value={s}>{s}pt</option>)}
            </select>
            <input
              type="color"
              onMouseDown={captureSelection}
              onChange={e => applyToSelection(() => execOnSelection("foreColor", e.target.value))}
              style={{ width: 26, height: 22, borderRadius: 5, border: `1px solid ${BORDER}`, background: "none", cursor: "pointer", padding: 0 }}
              title="Selection color"
            />
          </>
        ) : (
          <>
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
          </>
        )}
        <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>Page {pageNum}</span>
      </div>

      <div ref={wrapRef} style={{ width: "100%", height: box.height * scale, position: "relative" }}>
        <div
          ref={boxRef}
          onMouseMove={isIntro ? onBlockMouseMove : undefined}
          onMouseUp={isIntro ? onBlockMouseUp : undefined}
          onMouseLeave={isIntro ? onBlockMouseUp : undefined}
          onClick={isIntro ? () => onSelectIntroBlock?.(null) : undefined}
          style={{
            width: box.width,
            height: box.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: styles.pageBackground,
            boxShadow: "0 8px 48px rgba(0,0,0,0.55)",
            borderRadius: 2,
            position: "relative",
            overflow: "hidden",
          }}>
          {isIntro ? (
            <>
              {guide.x !== null && (
                <div style={{
                  position: "absolute", left: `${guide.x}%`, top: 0, bottom: 0, width: 1,
                  background: "#e05a8a", pointerEvents: "none", zIndex: 5,
                }} />
              )}
              {guide.y !== null && (
                <div style={{
                  position: "absolute", top: `${guide.y}%`, left: 0, right: 0, height: 1,
                  background: "#e05a8a", pointerEvents: "none", zIndex: 5,
                }} />
              )}
              {(introBlocks || []).map(block => (
              <div
                key={block.id}
                ref={el => { if (el) blockEls.current.set(block.id, el); else blockEls.current.delete(block.id); }}
                contentEditable
                suppressContentEditableWarning
                onClick={e => e.stopPropagation()}
                onFocus={() => { focusedBlockId.current = block.id; }}
                onMouseDown={e => {
                  e.stopPropagation();
                  if (selIntroBlockId !== block.id) {
                    // Not yet selected: select it and arm a position-drag.
                    // preventDefault stops the browser's native
                    // text-selection/drag from also kicking in — caught in
                    // testing: a real drag gesture without this silently
                    // mangled the block's text (inserted a stray newline).
                    e.preventDefault();
                    e.currentTarget.focus();
                    onSelectIntroBlock?.(block.id);
                    dragging.current = { id: block.id, startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y };
                  }
                  // Already selected: let the native click/selection
                  // behavior proceed instead — this is how you place a
                  // cursor or select a substring to format. Click the page
                  // background to deselect, then click-drag to reposition.
                }}
                onBlur={e => {
                  if (focusedBlockId.current === block.id) focusedBlockId.current = null;
                  onEditIntroBlock?.(block.id, { text: e.currentTarget.innerHTML });
                }}
                style={{
                  position: "absolute",
                  left: `${block.x}%`, top: `${block.y}%`,
                  transform: `translate(-50%, -50%) rotate(${block.rotation ?? 0}deg)`,
                  cursor: "grab",
                  fontFamily: block.fontFamily || styles.fontFamily,
                  fontSize: block.fontSize,
                  color: block.color,
                  fontWeight: block.bold ? 700 : 400,
                  textAlign: block.align,
                  padding: "4px 8px",
                  outline: selIntroBlockId === block.id ? "2px dashed rgba(255,255,255,0.6)" : "none",
                  borderRadius: 4,
                  whiteSpace: "pre-wrap",
                  maxWidth: "90%",
                }}
              />
              ))}
            </>
          ) : (
            <div
              ref={divRef}
              contentEditable
              suppressContentEditableWarning
              onFocus={() => { focused.current = true; }}
              onBlur={e => { focused.current = false; onSave(page.id, e.currentTarget.innerHTML); }}
              style={{
                width: box.width,
                height: box.height,
                padding: `${styles.marginV}px ${styles.marginH}px`,
                fontFamily: styles.fontFamily,
                fontSize: styles.fontSize,
                lineHeight: styles.lineHeight,
                color: styles.textColor,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}
          {styles.pageNumbers !== "off" && (
            <div style={{
              position: "absolute", bottom: 20,
              left: styles.pageNumbers === "bottom-left" ? styles.marginH : styles.pageNumbers === "bottom-right" ? undefined : "50%",
              right: styles.pageNumbers === "bottom-right" ? styles.marginH : undefined,
              transform: styles.pageNumbers === "bottom-center" ? "translateX(-50%)" : undefined,
              fontSize: 11, color: styles.textColor, opacity: 0.4, fontFamily: styles.fontFamily,
              paddingTop: 14,
            }}>
              {pageNum}
            </div>
          )}
        </div>
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
            // See the matching comment in PageCanvas's intro-block
            // onMouseDown — without preventDefault, dragging inside a
            // contentEditable node triggers the browser's native
            // text-selection/drag instead of our own position-drag.
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.focus();
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

/* ─── page pagination helpers ───────────────────────────────────
   A page is a fixed physical sheet — content that overflows its
   fillable area (page size minus margins) must flow onto the next
   page instead of spilling past the visible edge. We measure with
   a hidden clone at the page's real px width/height (not whatever
   width the on-screen canvas is scaled to) so breaks are stable
   across screen sizes. ──────────────────────────────────────── */
let _measureEl: HTMLDivElement | null = null;
function getMeasureEl(width: number, styles: BookStyles): HTMLDivElement {
  if (!_measureEl) {
    _measureEl = document.createElement("div");
    _measureEl.style.position = "fixed";
    _measureEl.style.left = "-99999px";
    _measureEl.style.top = "0";
    _measureEl.style.visibility = "hidden";
    _measureEl.style.pointerEvents = "none";
    document.body.appendChild(_measureEl);
  }
  _measureEl.style.width = `${width}px`;
  _measureEl.style.fontFamily = styles.fontFamily;
  _measureEl.style.fontSize = `${styles.fontSize}px`;
  _measureEl.style.lineHeight = String(styles.lineHeight);
  return _measureEl;
}

// Splits `html` into what fits within fillWidth x fillHeight and
// whatever overflows, at the granularity of top-level child nodes
// (paragraphs / line divs). If even the first node alone overflows,
// it's kept anyway so a page is never left empty.
function splitHtmlToFit(
  html: string, fillWidth: number, fillHeight: number, styles: BookStyles
): { fits: string; overflow: string | null } {
  const container = getMeasureEl(fillWidth, styles);
  container.innerHTML = html;

  if (container.scrollHeight <= fillHeight) {
    const fits = container.innerHTML;
    container.innerHTML = "";
    return { fits, overflow: null };
  }

  const nodes: ChildNode[] = [];
  while (container.firstChild) nodes.push(container.removeChild(container.firstChild));

  let splitIndex = nodes.length;
  for (let i = 0; i < nodes.length; i++) {
    container.appendChild(nodes[i]);
    if (container.scrollHeight > fillHeight) { splitIndex = i; break; }
  }
  if (splitIndex === 0) splitIndex = 1;

  container.innerHTML = "";
  const fitsWrap = document.createElement("div");
  const overflowWrap = document.createElement("div");
  nodes.forEach((n, i) => (i < splitIndex ? fitsWrap : overflowWrap).appendChild(n));

  return {
    fits: fitsWrap.innerHTML,
    overflow: overflowWrap.childNodes.length > 0 ? overflowWrap.innerHTML : null,
  };
}

/* ─── manuscript import helpers ─────────────────────────────────
   Paste a whole manuscript, split chapters on a lone "---" line,
   optionally name a chapter with a leading "# Title" line, and
   pack paragraphs into pages by an approximate word budget. ──── */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A chapter's intro page (page_number 0) starts as a single centered
// title block — see isIntro handling in PageCanvas / the reader's
// PageView. The user can then add/move/restyle blocks freely.
function defaultIntroBlock(title: string): TextBlock {
  return {
    // Intro-block text is rendered as HTML now (rich text) — escape a
    // plain chapter title so stray <, >, & display literally.
    id: "title", type: "title", text: escapeHtml(title),
    x: 50, y: 50, fontSize: 32, rotation: 0,
    color: "#1a1a1a", align: "center", bold: true,
  };
}

function defaultIntroContent(title: string): string {
  return JSON.stringify({ blocks: [defaultIntroBlock(title)] });
}

// Parses stored intro-page content. Recovers the old plain-HTML format
// (a single centered <div>Title</div>, from before intro pages were
// block-based) as an equivalent single block, so nothing already in the
// database breaks.
function parseIntroDesign(content: string | null): IntroDesign {
  if (!content) return { blocks: [] };
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.blocks)) return parsed as IntroDesign;
  } catch {
    const text = content.replace(/<[^>]+>/g, "").trim();
    if (text) return { blocks: [defaultIntroBlock(text)] };
  }
  return { blocks: [] };
}

function parseChapterChunk(raw: string): { title: string | null; paragraphs: string[] } {
  const lines = raw.split("\n");
  let title: string | null = null;
  let bodyStart = 0;
  if (lines[0]?.trim().startsWith("# ")) {
    title = lines[0].trim().slice(2).trim();
    bodyStart = 1;
  }
  const body = lines.slice(bodyStart).join("\n").trim();
  const paragraphs = body
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return { title, paragraphs };
}

function parseManuscript(raw: string): { title: string | null; paragraphs: string[] }[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[][] = [[]];
  for (const line of lines) {
    if (line.trim() === "---") chunks.push([]);
    else chunks[chunks.length - 1].push(line);
  }
  return chunks.map(ls => parseChapterChunk(ls.join("\n"))).filter(c => c.paragraphs.length > 0);
}

function paginateParagraphs(paragraphs: string[], wordsPerPage: number): string[] {
  const pages: string[][] = [];
  let current: string[] = [];
  let wordCount = 0;
  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).filter(Boolean).length;
    if (current.length > 0 && wordCount + paraWords > wordsPerPage) {
      pages.push(current);
      current = [];
      wordCount = 0;
    }
    current.push(para);
    wordCount += paraWords;
  }
  if (current.length > 0) pages.push(current);
  return pages.map(paras => paras.map(p => `<p>${escapeHtml(p)}</p>`).join(""));
}

/* ─── main page ──────────────────────────────────────────────── */
export default function BookEditorPage() {
  const params  = useParams();
  const router  = useRouter();
  const supabase = useMemo(() => getBrowserClient(), []);

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

  // Intro-page block editing (chapter intro pages, page_number 0) — a
  // local draft mirroring the selected intro page's parsed content,
  // synced from the DB when the selected page changes and written back
  // via savePage() on drag-end / blur / property-panel edits.
  const [introDraft,      setIntroDraft]      = useState<TextBlock[] | null>(null);
  const [selIntroBlockId, setSelIntroBlockId] = useState<string | null>(null);

  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState<string | null>(null);
  const [addingPg,    setAddingPg]    = useState(false);
  const [addingCh,    setAddingCh]    = useState(false);
  const [rightPanel,  setRightPanel]  = useState<"styles" | "cover" | "intro">("styles");

  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState("");
  const [importWpp,   setImportWpp]   = useState(450);
  const [importing,   setImporting]   = useState(false);
  const [importMsg,   setImportMsg]   = useState<string | null>(null);

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
    let chapterId: string | null = null;
    let page: PageRow | undefined;
    for (const [chId, pgs] of Object.entries(pagesMap)) {
      const found = pgs.find(p => p.id === pageId);
      if (found) { chapterId = chId; page = found; break; }
    }
    if (!chapterId) return;

    // The intro page (page_number 0) is a single fixed block, not part of
    // the flowing content cascade — never reflow overflow out of/into it.
    if (page?.page_number === 0) {
      await supabase.from("pages").update({ content: html }).eq("id", pageId);
      setPagesMap(prev => ({
        ...prev,
        [chapterId!]: (prev[chapterId!] || []).map(p => p.id === pageId ? { ...p, content: html } : p),
      }));
      return;
    }

    await reflowFromPage(chapterId, pageId, html);
  }

  // Cascades an edited page's content forward: whatever overflows this
  // page's fillable area gets pushed onto the front of the next page's
  // content, which is then re-measured the same way, and so on — new
  // pages are created at the end of the chapter if the cascade runs out
  // of existing pages to land on.
  async function reflowFromPage(chapterId: string, pageId: string, newHtml: string) {
    const box = PAGE_SIZE_PX[series?.page_size ?? "A4"] ?? PAGE_SIZE_PX.A4;
    const fillWidth  = box.width  - 2 * bookStyles.marginH;
    const fillHeight = box.height - 2 * bookStyles.marginV;

    const pages = [...(pagesMap[chapterId] || [])].sort((a, b) => a.page_number - b.page_number);
    const startIdx = pages.findIndex(p => p.id === pageId);
    if (startIdx === -1) return;

    const updates: { id: string; content: string }[] = [];
    const newPageContents: string[] = [];

    let carry: string | null = newHtml;
    let idx = startIdx;
    while (carry !== null) {
      const { fits, overflow } = splitHtmlToFit(carry, fillWidth, fillHeight, bookStyles);

      if (idx < pages.length) updates.push({ id: pages[idx].id, content: fits });
      else newPageContents.push(fits);

      if (!overflow) {
        carry = null;
      } else if (idx + 1 < pages.length) {
        carry = overflow + (pages[idx + 1].content || "");
        idx++;
      } else {
        carry = overflow;
        idx++;
      }
    }

    for (const u of updates) {
      await supabase.from("pages").update({ content: u.content }).eq("id", u.id);
    }

    let nextPageNumber = pages.length > 0 ? pages[pages.length - 1].page_number + 1 : 1;
    const insertedRows: PageRow[] = [];
    for (const content of newPageContents) {
      const { data } = await supabase
        .from("pages")
        .insert({ chapter_id: chapterId, page_number: nextPageNumber, content })
        .select("id, chapter_id, page_number, content")
        .single();
      if (data) insertedRows.push(data as PageRow);
      nextPageNumber++;
    }

    setPagesMap(prev => {
      const list = [...(prev[chapterId] || [])];
      for (const u of updates) {
        const i = list.findIndex(p => p.id === u.id);
        if (i !== -1) list[i] = { ...list[i], content: u.content };
      }
      return { ...prev, [chapterId]: [...list, ...insertedRows].sort((a, b) => a.page_number - b.page_number) };
    });
  }

  /* ── chapter ops ── */
  async function addChapter() {
    if (addingCh) return;
    setAddingCh(true);
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;
    const title = `Chapter ${nextNum}`;
    const { data, error } = await supabase
      .from("chapters").insert({ series_id: seriesId, chapter_number: nextNum, title, content: "", is_published: false })
      .select("id, chapter_number, title").maybeSingle();
    if (data) {
      const ch = data as ChapterRow;
      const { data: introPg } = await supabase
        .from("pages").insert({ chapter_id: ch.id, page_number: 0, content: defaultIntroContent(title) })
        .select("id, chapter_id, page_number, content").maybeSingle();
      setChapters(prev => [...prev, ch]);
      setPagesMap(prev => ({ ...prev, [ch.id]: introPg ? [introPg as PageRow] : [] }));
    } else if (error) {
      setSaveMsg("Save failed");
      setTimeout(() => setSaveMsg(null), 2000);
    }
    setAddingCh(false);
  }

  /* ── manuscript import ── */
  async function runImport() {
    if (importing) return;
    const chunks = parseManuscript(importText);
    if (chunks.length === 0) {
      setImportMsg("Paste some manuscript text first.");
      return;
    }
    setImporting(true);
    setImportMsg(null);

    let nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;
    let doneChapters = 0;
    let donePages = 0;

    for (const chunk of chunks) {
      const title = chunk.title || `Chapter ${nextNum}`;
      const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .insert({ series_id: seriesId, chapter_number: nextNum, title, content: "", is_published: false })
        .select("id, chapter_number, title")
        .single();

      if (chErr || !ch) {
        setImportMsg(`Imported ${doneChapters} chapter(s) before an error on "${title}". Fix and re-paste the rest to continue.`);
        setImporting(false);
        return;
      }

      const chapterRow = ch as ChapterRow;
      const pagesHtml = paginateParagraphs(chunk.paragraphs, importWpp);
      const rows = [
        { chapter_id: chapterRow.id, page_number: 0, content: defaultIntroContent(title) },
        ...pagesHtml.map((html, idx) => ({ chapter_id: chapterRow.id, page_number: idx + 1, content: html })),
      ];

      let insertedPages: PageRow[] = [];
      if (rows.length > 0) {
        const { data: pg, error: pgErr } = await supabase
          .from("pages").insert(rows)
          .select("id, chapter_id, page_number, content");
        if (pgErr) {
          setChapters(prev => [...prev, chapterRow]);
          setPagesMap(prev => ({ ...prev, [chapterRow.id]: [] }));
          setImportMsg(`Chapter "${title}" was created but its pages failed to save. Add pages manually, or delete the chapter and re-import.`);
          setImporting(false);
          return;
        }
        insertedPages = (pg as PageRow[]) || [];
      }

      setChapters(prev => [...prev, chapterRow]);
      setPagesMap(prev => ({ ...prev, [chapterRow.id]: insertedPages }));
      doneChapters++;
      donePages += insertedPages.length;
      nextNum++;
    }

    setImportMsg(`Imported ${doneChapters} chapter(s), ${donePages} page(s).`);
    setImportText("");
    setImporting(false);
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
  const selIntroBlock = (introDraft || []).find(b => b.id === selIntroBlockId) ?? null;

  /* ── intro-page block helpers ──
     Sync the local draft from the DB only when the selected page id
     changes (not on every pagesMap update, including the ones our own
     saves cause below) so an in-progress drag/edit is never clobbered. */
  // introSaveBlocks holds exactly what a pending debounced timer will
  // write — a ref, not state, so unmount/page-switch cleanup can flush
  // it without a stale closure over introDraft.
  const introSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introSavePageId = useRef<string | null>(null);
  const introSaveBlocks = useRef<TextBlock[] | null>(null);

  function flushIntroSave() {
    if (!introSaveTimer.current) return;
    clearTimeout(introSaveTimer.current);
    introSaveTimer.current = null;
    if (introSavePageId.current && introSaveBlocks.current) {
      savePage(introSavePageId.current, JSON.stringify({ blocks: introSaveBlocks.current }));
    }
  }

  useEffect(() => {
    // A page switch mid-edit must flush any pending debounced write for
    // the page being left — otherwise the last keystroke there is lost.
    flushIntroSave();
    if (selPage && selPage.page_number === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIntroDraft(parseIntroDesign(selPage.content).blocks);
    } else {
      setIntroDraft(null);
      setSelIntroBlockId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selPage?.id]);

  // Flush a pending debounced intro-block write if the editor unmounts
  // (navigating away) before the timer fires.
  useEffect(() => flushIntroSave, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Local-only update, used while dragging — commitIntroBlocks() (no
  // args, reading the latest introDraft) fires separately on drag-end.
  function updateIntroBlock(id: string, delta: Partial<TextBlock>) {
    setIntroDraft(prev => prev ? prev.map(b => b.id === id ? { ...b, ...delta } : b) : prev);
  }

  function commitIntroBlocks(blocks?: TextBlock[]) {
    if (!selPage) return;
    if (introSaveTimer.current) { clearTimeout(introSaveTimer.current); introSaveTimer.current = null; }
    introSaveBlocks.current = null;
    savePage(selPage.id, JSON.stringify({ blocks: blocks ?? introDraft ?? [] }));
  }

  // Update + commit in one step, computing the new array explicitly
  // rather than reading introDraft right back (setIntroDraft is async,
  // so a bare updateIntroBlock() + commitIntroBlocks() pair in the same
  // handler would commit the stale pre-update blocks). The actual write
  // is debounced — property-panel controls (text keystrokes, slider
  // drags) fire this on every change, and un-debounced concurrent writes
  // for the same page can resolve out of order and leave a stale value
  // in the DB even though the UI shows the latest edit. Only the drag
  // path (its own commit on mouseup, a single natural endpoint) and
  // add/delete block (discrete, rare) commit immediately.
  function editIntroBlock(id: string, delta: Partial<TextBlock>) {
    if (!introDraft || !selPage) return;
    const updated = introDraft.map(b => b.id === id ? { ...b, ...delta } : b);
    setIntroDraft(updated);
    if (introSaveTimer.current) clearTimeout(introSaveTimer.current);
    introSavePageId.current = selPage.id;
    introSaveBlocks.current = updated;
    introSaveTimer.current = setTimeout(() => {
      savePage(selPage.id, JSON.stringify({ blocks: updated }));
      introSaveTimer.current = null;
      introSaveBlocks.current = null;
    }, 400);
  }

  function addIntroBlock() {
    if (!introDraft) return;
    const newBlock: TextBlock = {
      id: `block-${Date.now()}`, type: "text", text: "New text",
      x: 50, y: 50, fontSize: 18, rotation: 0,
      color: bookStyles.textColor, align: "center", bold: false,
    };
    const updated = [...introDraft, newBlock];
    setIntroDraft(updated);
    setSelIntroBlockId(newBlock.id);
    commitIntroBlocks(updated);
  }

  function deleteIntroBlock(id: string) {
    if (!introDraft) return;
    const updated = introDraft.filter(b => b.id !== id);
    setIntroDraft(updated);
    if (selIntroBlockId === id) setSelIntroBlockId(null);
    commitIntroBlocks(updated);
  }

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
          onClick={() => setShowImport(true)}
          style={{ padding: "6px 14px", borderRadius: 9999, border: `1px solid ${BORDER}`, background: "none", color: TEXT, fontSize: 12, cursor: "pointer" }}
        >
          Import manuscript
        </button>
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
                  onClick={() => { setView("page"); setSelChId(ch.id); setSelPgId(pg.id); setRightPanel(pg.page_number === 0 ? "intro" : "styles"); }}
                >
                  <span>{pg.page_number === 0 ? "Intro" : `Page ${pg.page_number}`}</span>
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
                pageSizeKey={series?.page_size ?? "A4"}
                pageNum={flatPageNum}
                onSave={savePage}
                introBlocks={introDraft}
                selIntroBlockId={selIntroBlockId}
                onSelectIntroBlock={setSelIntroBlockId}
                onUpdateIntroBlock={updateIntroBlock}
                onCommitIntroBlocks={commitIntroBlocks}
                onEditIntroBlock={editIntroBlock}
                onAddIntroBlock={addIntroBlock}
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
            {(["styles", "cover", ...(selPage?.page_number === 0 ? ["intro"] as const : [])] as const).map(tab => (
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
                {tab === "styles" ? "Page Styles" : tab === "cover" ? "Cover Design" : "Intro Blocks"}
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

            {/* ── Intro Page Blocks ── */}
            {rightPanel === "intro" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                  Click a text block to select it, drag to reposition. &quot;+ Add text block&quot; above the page adds another.
                </p>

                {selIntroBlock ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="Text">
                      <input value={selIntroBlock.text} onChange={e => editIntroBlock(selIntroBlock.id, { text: e.target.value })}
                        style={{ ...inputStyle, width: "100%" }} />
                    </Field>
                    <Field label="Font family">
                      <select value={selIntroBlock.fontFamily || bookStyles.fontFamily}
                        onChange={e => editIntroBlock(selIntroBlock.id, { fontFamily: e.target.value })} style={selectStyle}>
                        {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label={`Size — ${selIntroBlock.fontSize}pt`}>
                      <input type="range" min={10} max={96} step={1} value={selIntroBlock.fontSize}
                        onChange={e => editIntroBlock(selIntroBlock.id, { fontSize: Number(e.target.value) })} style={{ width: "100%" }} />
                    </Field>
                    <Field label={`Rotation — ${selIntroBlock.rotation ?? 0}°`}>
                      <input type="range" min={-180} max={180} step={1} value={selIntroBlock.rotation ?? 0}
                        onChange={e => editIntroBlock(selIntroBlock.id, { rotation: Number(e.target.value) })} style={{ width: "100%" }} />
                    </Field>
                    <Field label="Color">
                      <input type="color" value={selIntroBlock.color} onChange={e => editIntroBlock(selIntroBlock.id, { color: e.target.value })}
                        style={{ width: 32, height: 28, borderRadius: 6, border: "none", cursor: "pointer" }} />
                    </Field>
                    <Field label="Alignment">
                      <div style={{ display: "flex", gap: 4 }}>
                        {(["left", "center", "right"] as const).map(a => (
                          <button key={a} onClick={() => editIntroBlock(selIntroBlock.id, { align: a })}
                            style={{ flex: 1, padding: "4px 0", fontSize: 11, borderRadius: 6, border: `1px solid ${BORDER}`, background: selIntroBlock.align === a ? ACCENT : "transparent", color: selIntroBlock.align === a ? "#0a0a0c" : MUTED, cursor: "pointer" }}>
                            {a[0].toUpperCase() + a.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT, cursor: "pointer" }}>
                      <input type="checkbox" checked={selIntroBlock.bold} onChange={e => editIntroBlock(selIntroBlock.id, { bold: e.target.checked })} />
                      Bold
                    </label>
                    <button onClick={() => deleteIntroBlock(selIntroBlock.id)}
                      style={{ fontSize: 11, color: "#c97a6a", background: "none", border: "1px solid rgba(201,122,106,0.3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginTop: 4 }}>
                      Delete block
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: MUTED }}>Click a text block on the page to edit it.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Import manuscript modal ── */}
      {showImport && (
        <div
          onClick={() => !importing && setShowImport(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#16161a", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, width: 640, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Import manuscript</span>
              <button onClick={() => setShowImport(false)} disabled={importing} style={{ background: "none", border: "none", color: MUTED, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>

            <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.6 }}>
              Paste your full manuscript below, or load a text file. Separate chapters with a line
              containing only <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>---</code>.
              Start a chapter with <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}># Chapter Title</code> on
              its own line to name it — otherwise chapters are numbered automatically. New chapters are added after any that already exist.
            </p>

            <label style={{ display: "inline-flex", width: "fit-content", padding: "6px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, color: TEXT, cursor: "pointer" }}>
              Load from file (.txt, .md)
              <input
                type="file"
                accept=".txt,.md,text/plain"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImportText(String(reader.result || ""));
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
            </label>

            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={"# Chapter 1\n\nYour first paragraph...\n\nAnother paragraph...\n\n---\n\n# Chapter 2\n\n..."}
              style={{ width: "100%", minHeight: 260, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, color: TEXT, fontSize: 13, fontFamily: "Georgia, serif", resize: "vertical", boxSizing: "border-box" }}
            />

            <Field label={`Words per page (approx) — ${importWpp}`}>
              <input type="range" min={200} max={800} step={25} value={importWpp}
                onChange={e => setImportWpp(Number(e.target.value))} style={{ width: "100%" }} />
            </Field>

            {importMsg && (
              <p style={{ fontSize: 12, color: importMsg.startsWith("Imported") ? SUCCESS : "#c97a6a", margin: 0 }}>{importMsg}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowImport(false)} disabled={importing} style={{ padding: "8px 16px", borderRadius: 9999, background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 12, cursor: "pointer" }}>
                Close
              </button>
              <button
                onClick={runImport}
                disabled={importing || !importText.trim()}
                style={{ padding: "8px 18px", borderRadius: 9999, background: ACCENT, color: "#0a0a0c", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", opacity: importing || !importText.trim() ? 0.5 : 1 }}
              >
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
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
