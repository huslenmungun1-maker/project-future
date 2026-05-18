"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { safeLocale } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type BubbleStyle = "round" | "box" | "thought" | "shout";
type TailDir = "bl" | "br" | "none";

interface Bubble {
  id: string;
  x: number; y: number; w: number; h: number; // 0–1 fractions of canvas
  text: string;
  style: BubbleStyle;
  tailDir: TailDir;
  fillColor: string;
  strokeColor: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  textColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = [
  { value: "Arial, sans-serif",          label: "Arial"      },
  { value: "Georgia, serif",             label: "Georgia"    },
  { value: "'Comic Sans MS', cursive",   label: "Comic Sans" },
  { value: "'Courier New', monospace",   label: "Courier"    },
  { value: "Impact, sans-serif",         label: "Impact"     },
];

const STYLE_LABELS: Record<BubbleStyle, string> = {
  round: "Speech", box: "Box", thought: "Thought", shout: "Shout",
};

// Text-area inset per style (fractions of bubble w/h)
const TA: Record<BubbleStyle, { px: number; pt: number; pb: number }> = {
  round:   { px: 0.16, pt: 0.06, pb: 0.26 },
  box:     { px: 0.12, pt: 0.08, pb: 0.30 },
  thought: { px: 0.20, pt: 0.08, pb: 0.28 },
  shout:   { px: 0.26, pt: 0.24, pb: 0.24 },
};

function mkBubble(x: number, y: number, style: BubbleStyle): Bubble {
  return {
    id: crypto.randomUUID(), x, y, w: 0.22, h: 0.17,
    text: "...", style,
    tailDir: style === "shout" ? "none" : "bl",
    fillColor: style === "shout" ? "#fff176" : "#ffffff",
    strokeColor: "#1a1a1a",
    fontSize: 13, fontFamily: "Arial, sans-serif",
    bold: false, italic: false, textColor: "#1a1a1a",
  };
}

// ─── SVG Bubble shapes ────────────────────────────────────────────────────────

function RoundShape({ fill, stroke, sw, tailDir }: { fill: string; stroke: string; sw: number; tailDir: TailDir }) {
  const bl = tailDir === "bl";
  const hasTail = tailDir !== "none";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
      {hasTail && (
        <>
          <polygon points={bl ? "23,69 10,92 40,71" : "77,69 90,92 60,71"} fill={fill} />
          {bl ? (
            <>
              <line x1="23" y1="69" x2="10" y2="92" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="10" y1="92" x2="40" y2="71" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="25" y1="69.5" x2="38" y2="71" stroke={fill} strokeWidth={sw + 1.5} />
            </>
          ) : (
            <>
              <line x1="77" y1="69" x2="90" y2="92" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="90" y1="92" x2="60" y2="71" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="75" y1="69.5" x2="62" y2="71" stroke={fill} strokeWidth={sw + 1.5} />
            </>
          )}
        </>
      )}
      <ellipse cx="50" cy="42" rx="47" ry="36" fill={fill} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

function BoxShape({ fill, stroke, sw, tailDir }: { fill: string; stroke: string; sw: number; tailDir: TailDir }) {
  const bl = tailDir === "bl";
  const hasTail = tailDir !== "none";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
      {hasTail && (
        <>
          <polygon points={bl ? "15,76 9,94 34,76" : "85,76 91,94 66,76"} fill={fill} />
          {bl ? (
            <>
              <line x1="15" y1="76" x2="9" y2="94" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="9" y1="94" x2="34" y2="76" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="16" y1="77" x2="33" y2="77" stroke={fill} strokeWidth={sw + 1.5} />
            </>
          ) : (
            <>
              <line x1="85" y1="76" x2="91" y2="94" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="91" y1="94" x2="66" y2="76" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
              <line x1="84" y1="77" x2="67" y2="77" stroke={fill} strokeWidth={sw + 1.5} />
            </>
          )}
        </>
      )}
      <rect x="4" y="4" width="92" height="72" rx="7" ry="7" fill={fill} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

function ThoughtShape({ fill, stroke, sw, tailDir }: { fill: string; stroke: string; sw: number; tailDir: TailDir }) {
  const bl = tailDir === "bl";
  const hasTail = tailDir !== "none";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
      {/* Tail dots */}
      {hasTail && (
        <>
          <circle cx={bl ? 24 : 76} cy="75" r="6"   fill={fill} stroke={stroke} strokeWidth={sw} />
          <circle cx={bl ? 17 : 83} cy="86" r="4"   fill={fill} stroke={stroke} strokeWidth={sw} />
          <circle cx={bl ? 12 : 88} cy="93" r="2.5" fill={fill} stroke={stroke} strokeWidth={sw} />
        </>
      )}
      {/* Cloud lobes — filled first, no stroke */}
      <ellipse cx="22" cy="53" rx="15" ry="12" fill={fill} stroke="none" />
      <ellipse cx="78" cy="53" rx="15" ry="12" fill={fill} stroke="none" />
      <ellipse cx="33" cy="28" rx="17" ry="13" fill={fill} stroke="none" />
      <ellipse cx="67" cy="28" rx="17" ry="13" fill={fill} stroke="none" />
      {/* Main body fills then strokes outer lobes */}
      <ellipse cx="50" cy="42" rx="40" ry="30" fill={fill} stroke="none" />
      {/* Cover inner seam */}
      <ellipse cx="50" cy="48" rx="27" ry="16" fill={fill} stroke="none" />
      {/* Outer-visible strokes */}
      <ellipse cx="22" cy="53" rx="15" ry="12" fill="none" stroke={stroke} strokeWidth={sw} />
      <ellipse cx="78" cy="53" rx="15" ry="12" fill="none" stroke={stroke} strokeWidth={sw} />
      <ellipse cx="33" cy="28" rx="17" ry="13" fill="none" stroke={stroke} strokeWidth={sw} />
      <ellipse cx="67" cy="28" rx="17" ry="13" fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Main body on top */}
      <ellipse cx="50" cy="42" rx="36" ry="27" fill={fill} stroke="none" />
      <ellipse cx="50" cy="42" rx="40" ry="30" fill="none" stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

function ShoutShape({ fill, stroke, sw }: { fill: string; stroke: string; sw: number }) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 47 : 29;
    pts.push(`${(50 + Math.cos(angle) * r).toFixed(1)},${(50 + Math.sin(angle) * r).toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
      <polygon points={pts.join(" ")} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  );
}

function BubbleShape({ style, fill, stroke, sw, tailDir }: {
  style: BubbleStyle; fill: string; stroke: string; sw: number; tailDir: TailDir;
}) {
  if (style === "round")   return <RoundShape   fill={fill} stroke={stroke} sw={sw} tailDir={tailDir} />;
  if (style === "box")     return <BoxShape     fill={fill} stroke={stroke} sw={sw} tailDir={tailDir} />;
  if (style === "thought") return <ThoughtShape fill={fill} stroke={stroke} sw={sw} tailDir={tailDir} />;
  return <ShoutShape fill={fill} stroke={stroke} sw={sw} />;
}

// ─── Canvas export ────────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(" ");
    let cur = "";
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
      else cur = test;
    }
    lines.push(cur);
  }
  return lines;
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble, cw: number, ch: number, scale: number) {
  const x = b.x * cw, y = b.y * ch, w = b.w * cw, h = b.h * ch;
  const f = b.fillColor, s = b.strokeColor, lw = 2 * scale;
  ctx.save();

  // helper: map from [0-100] SVG coords to canvas px
  const px = (svgX: number) => x + (svgX / 100) * w;
  const py = (svgY: number) => y + (svgY / 100) * h;
  const bl = b.tailDir === "bl";

  if (b.style === "round") {
    if (b.tailDir !== "none") {
      ctx.beginPath();
      ctx.moveTo(px(bl?23:77), py(69)); ctx.lineTo(px(bl?10:90), py(92)); ctx.lineTo(px(bl?40:60), py(71));
      ctx.closePath(); ctx.fillStyle = f; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px(bl?23:77), py(69)); ctx.lineTo(px(bl?10:90), py(92));
      ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px(bl?10:90), py(92)); ctx.lineTo(px(bl?40:60), py(71));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px(bl?25:75), py(69.5)); ctx.lineTo(px(bl?38:62), py(71));
      ctx.strokeStyle = f; ctx.lineWidth = lw + scale; ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(px(50), py(42), w * 0.47, h * 0.36, 0, 0, Math.PI * 2);
    ctx.fillStyle = f; ctx.fill(); ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke();
  }

  else if (b.style === "box") {
    if (b.tailDir !== "none") {
      ctx.beginPath();
      ctx.moveTo(px(bl?15:85), py(76)); ctx.lineTo(px(bl?9:91), py(94)); ctx.lineTo(px(bl?34:66), py(76));
      ctx.closePath(); ctx.fillStyle = f; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px(bl?15:85), py(76)); ctx.lineTo(px(bl?9:91), py(94));
      ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px(bl?9:91), py(94)); ctx.lineTo(px(bl?34:66), py(76)); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px(bl?16:84), py(77)); ctx.lineTo(px(bl?33:67), py(77));
      ctx.strokeStyle = f; ctx.lineWidth = lw + scale; ctx.stroke();
    }
    const bx = px(4), by = py(4), bw = w * 0.92, bh = h * 0.72, r = Math.min(bw, bh) * 0.08;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, r);
    ctx.fillStyle = f; ctx.fill(); ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke();
  }

  else if (b.style === "thought") {
    const lobes: [number,number,number,number][] = [
      [22,53,15,12],[78,53,15,12],[33,28,17,13],[67,28,17,13],
    ];
    // Fill lobes
    for (const [cx,cy,rx,ry] of lobes) {
      ctx.beginPath();
      ctx.ellipse(px(cx), py(cy), w*(rx/100), h*(ry/100), 0, 0, Math.PI*2);
      ctx.fillStyle = f; ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(px(50),py(42),w*0.40,h*0.30,0,0,Math.PI*2); ctx.fillStyle=f; ctx.fill();
    ctx.beginPath(); ctx.ellipse(px(50),py(48),w*0.27,h*0.16,0,0,Math.PI*2); ctx.fillStyle=f; ctx.fill();
    // Stroke lobes
    for (const [cx,cy,rx,ry] of lobes) {
      ctx.beginPath();
      ctx.ellipse(px(cx), py(cy), w*(rx/100), h*(ry/100), 0, 0, Math.PI*2);
      ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke();
    }
    // Main body fill then stroke
    ctx.beginPath(); ctx.ellipse(px(50),py(42),w*0.36,h*0.27,0,0,Math.PI*2); ctx.fillStyle=f; ctx.fill();
    ctx.beginPath(); ctx.ellipse(px(50),py(42),w*0.40,h*0.30,0,0,Math.PI*2);
    ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke();
    // Tail dots
    if (b.tailDir !== "none") {
      const dots = [
        { cx: bl?24:76, cy: 75, r: 6  },
        { cx: bl?17:83, cy: 86, r: 4  },
        { cx: bl?12:88, cy: 93, r: 2.5},
      ];
      for (const d of dots) {
        ctx.beginPath(); ctx.arc(px(d.cx), py(d.cy), w*(d.r/100), 0, Math.PI*2);
        ctx.fillStyle = f; ctx.fill(); ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.stroke();
      }
    }
  }

  else if (b.style === "shout") {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 47 : 29;
      const svgX = 50 + Math.cos(angle) * r;
      const svgY = 50 + Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(px(svgX), py(svgY)) : ctx.lineTo(px(svgX), py(svgY));
    }
    ctx.closePath();
    ctx.fillStyle = f; ctx.fill(); ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke();
  }

  // Text
  const ta = TA[b.style];
  const textX = x + w * ta.px + (w * (1 - 2 * ta.px)) / 2;
  const textW = w * (1 - 2 * ta.px);
  const textAreaTop = y + h * ta.pt;
  const textAreaH = h * (1 - ta.pt - ta.pb);
  const fs = b.fontSize * scale;
  ctx.font = `${b.italic ? "italic" : "normal"} ${b.bold ? "bold" : "normal"} ${fs}px ${b.fontFamily}`;
  ctx.fillStyle = b.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapText(ctx, b.text, textW);
  const lineH = fs * 1.35;
  const startY = textAreaTop + textAreaH / 2 - (lines.length * lineH) / 2 + lineH / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, startY + i * lineH, textW);
  }
  ctx.restore();
}

// ─── BubbleNode ───────────────────────────────────────────────────────────────

interface NodeProps {
  b: Bubble;
  selected: boolean;
  editing: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResizeDown: (e: React.MouseEvent, id: string) => void;
  onDblClick: (id: string) => void;
  onTextChange: (id: string, t: string) => void;
  onBlur: () => void;
}

function BubbleNode({ b, selected, editing, onMouseDown, onResizeDown, onDblClick, onTextChange, onBlur }: NodeProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const ta = TA[b.style];

  useEffect(() => {
    if (editing && taRef.current) { taRef.current.focus(); taRef.current.select(); }
  }, [editing]);

  const textStyle: React.CSSProperties = {
    position: "absolute",
    left:   `${ta.px * 100}%`,
    top:    `${ta.pt * 100}%`,
    right:  `${ta.px * 100}%`,
    bottom: `${ta.pb * 100}%`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: b.fontSize, fontFamily: b.fontFamily,
    fontWeight: b.bold ? "bold" : "normal",
    fontStyle:  b.italic ? "italic" : "normal",
    color: b.textColor,
    textAlign: "center", lineHeight: 1.35,
    wordBreak: "break-word", overflow: "hidden", whiteSpace: "pre-wrap",
  };

  return (
    <div
      onMouseDown={e => onMouseDown(e, b.id)}
      onClick={e => e.stopPropagation()}
      onDoubleClick={() => onDblClick(b.id)}
      style={{
        position: "absolute",
        left: `${b.x * 100}%`, top: `${b.y * 100}%`,
        width: `${b.w * 100}%`, height: `${b.h * 100}%`,
        cursor: editing ? "text" : "move",
        userSelect: "none",
      }}
    >
      <BubbleShape style={b.style} fill={b.fillColor} stroke={b.strokeColor} sw={2} tailDir={b.tailDir} />

      {/* Static text */}
      {!editing && (
        <div style={{ ...textStyle, pointerEvents: "none" }}>
          {b.text}
        </div>
      )}

      {/* Textarea (edit mode) */}
      {editing && (
        <textarea
          ref={taRef}
          value={b.text}
          onChange={e => onTextChange(b.id, e.target.value)}
          onBlur={onBlur}
          onClick={e => e.stopPropagation()}
          style={{
            ...textStyle,
            background: "transparent", border: "none", outline: "none",
            resize: "none", padding: 0, cursor: "text", zIndex: 2,
          }}
        />
      )}

      {/* Selection ring */}
      {selected && !editing && (
        <div style={{
          position: "absolute", inset: -2,
          border: "1.5px dashed rgba(94,99,87,0.55)",
          borderRadius: 4, pointerEvents: "none",
        }} />
      )}

      {/* Resize handle */}
      {selected && (
        <div
          onMouseDown={e => onResizeDown(e, b.id)}
          style={{
            position: "absolute", bottom: -6, right: -6,
            width: 13, height: 13,
            background: "white", border: "2px solid rgba(94,99,87,0.55)",
            borderRadius: 3, cursor: "se-resize", zIndex: 10,
          }}
        />
      )}
    </div>
  );
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropsPanel({ b, onChange, onDelete }: {
  b: Bubble; onChange: (p: Partial<Bubble>) => void; onDelete: () => void;
}) {
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 5,
  };
  const row: React.CSSProperties = { marginBottom: 14 };
  const pill = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "5px 0", borderRadius: 8, fontSize: 11, fontWeight: active ? 600 : 500,
    border: `1.5px solid ${active ? "rgba(94,99,87,0.50)" : "rgba(94,99,87,0.14)"}`,
    background: active ? "rgba(94,99,87,0.10)" : "transparent",
    color: active ? "var(--accent)" : "var(--muted)", cursor: "pointer",
    transition: "all 100ms ease",
  });

  return (
    <div style={{ padding: "16px 13px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
        Properties
      </div>

      {/* Style */}
      <div style={row}>
        <span style={lbl}>Style</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          {(["round","box","thought","shout"] as BubbleStyle[]).map(s => (
            <button key={s} onClick={() => onChange({ style: s, tailDir: s === "shout" ? "none" : (b.tailDir === "none" ? "bl" : b.tailDir) })}
              style={pill(b.style === s)}>
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tail */}
      {b.style !== "shout" && (
        <div style={row}>
          <span style={lbl}>Tail</span>
          <div style={{ display: "flex", gap: 5 }}>
            {(["bl","br","none"] as TailDir[]).map(d => (
              <button key={d} onClick={() => onChange({ tailDir: d })} style={pill(b.tailDir === d)}>
                {d === "bl" ? "↙" : d === "br" ? "↘" : "—"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Colors */}
      <div style={row}>
        <span style={lbl}>Colors</span>
        <div style={{ display: "flex", gap: 6 }}>
          {([["Fill", "fillColor"], ["Stroke", "strokeColor"], ["Text", "textColor"]] as [string, keyof Bubble][]).map(([label, key]) => (
            <div key={key} style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 3, textAlign: "center" }}>{label}</div>
              <input type="color" value={b[key] as string}
                onChange={e => onChange({ [key]: e.target.value })}
                style={{ width: "100%", height: 28, borderRadius: 6, border: "1px solid rgba(94,99,87,0.2)", cursor: "pointer", padding: 2 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Font family */}
      <div style={row}>
        <span style={lbl}>Font</span>
        <select value={b.fontFamily} onChange={e => onChange({ fontFamily: e.target.value })}
          style={{
            width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 12,
            border: "1.5px solid rgba(94,99,87,0.14)", background: "rgba(255,255,255,0.75)",
            color: "var(--text)", outline: "none", marginBottom: 7, cursor: "pointer",
          }}>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Font size */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="range" min={9} max={40} value={b.fontSize}
            onChange={e => onChange({ fontSize: Number(e.target.value) })}
            style={{ flex: 1, accentColor: "var(--accent)" }} />
          <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 22, textAlign: "right" }}>{b.fontSize}</span>
        </div>

        {/* Bold / Italic */}
        <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
          <button onClick={() => onChange({ bold: !b.bold })}
            style={{ ...pill(b.bold), fontSize: 14, fontWeight: "bold" }}>B</button>
          <button onClick={() => onChange({ italic: !b.italic })}
            style={{ ...pill(b.italic), fontSize: 14, fontStyle: "italic" }}>I</button>
        </div>
      </div>

      {/* Delete */}
      <div style={{ marginTop: "auto" }}>
        <button onClick={onDelete}
          style={{
            width: "100%", padding: "8px 0", borderRadius: 9, fontSize: 12, fontWeight: 600,
            border: "1.5px solid rgba(185,28,28,0.3)", background: "rgba(185,28,28,0.06)",
            color: "#b01c1c", cursor: "pointer",
          }}>
          Delete bubble
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EditorPage() {
  const params = useParams();
  const locale = safeLocale(params?.locale) || "en";

  const canvasRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const [bgUrl,  setBgUrl]  = useState<string | null>(null);
  const [bgSize, setBgSize] = useState({ w: 800, h: 1200 });
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selId,  setSelId]  = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [tool,   setTool]   = useState<"select" | "add">("select");
  const [addSty, setAddSty] = useState<BubbleStyle>("round");

  const [drag,   setDrag]   = useState<{ id:string; sx:number; sy:number; ox:number; oy:number } | null>(null);
  const [rsz,    setRsz]    = useState<{ id:string; sx:number; sy:number; ow:number; oh:number } | null>(null);

  const sel = useMemo(() => bubbles.find(b => b.id === selId) ?? null, [bubbles, selId]);

  // Upload
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setBgSize({ w: img.naturalWidth, h: img.naturalHeight }); setBgUrl(url); };
    img.src = url;
    e.target.value = "";
  }

  // Click canvas background
  function handleCanvasBg(e: React.MouseEvent<HTMLDivElement>) {
    if (tool !== "add") { setSelId(null); return; }
    if (!canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - r.left)  / r.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - r.top)   / r.height));
    const b = mkBubble(Math.max(0, fx - 0.11), Math.max(0, fy - 0.085), addSty);
    setBubbles(p => [...p, b]);
    setSelId(b.id);
    setTool("select");
  }

  // Bubble interaction
  function onBubbleDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (editId === id) return;
    setSelId(id);
    const b = bubbles.find(b => b.id === id)!;
    setDrag({ id, sx: e.clientX, sy: e.clientY, ox: b.x, oy: b.y });
  }
  function onResizeDown(e: React.MouseEvent, id: string) {
    e.stopPropagation(); e.preventDefault();
    const b = bubbles.find(b => b.id === id)!;
    setRsz({ id, sx: e.clientX, sy: e.clientY, ow: b.w, oh: b.h });
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    const cw = canvasRef.current.clientWidth, ch = canvasRef.current.clientHeight;
    if (drag) {
      const dx = (e.clientX - drag.sx) / cw, dy = (e.clientY - drag.sy) / ch;
      setBubbles(p => p.map(b => b.id === drag.id
        ? { ...b, x: Math.max(0, Math.min(1 - b.w, drag.ox + dx)), y: Math.max(0, Math.min(1 - b.h, drag.oy + dy)) }
        : b));
    }
    if (rsz) {
      const dx = (e.clientX - rsz.sx) / cw, dy = (e.clientY - rsz.sy) / ch;
      setBubbles(p => p.map(b => b.id === rsz.id
        ? { ...b, w: Math.max(0.06, rsz.ow + dx), h: Math.max(0.06, rsz.oh + dy) }
        : b));
    }
  }, [drag, rsz]);

  const onMouseUp = useCallback(() => { setDrag(null); setRsz(null); }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selId) {
        setBubbles(p => p.filter(b => b.id !== selId)); setSelId(null);
      }
      if (e.key === "Escape") {
        if (editId) { setEditId(null); return; }
        if (tool === "add") { setTool("select"); return; }
        setSelId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selId, editId, tool]);

  function updateBubble(id: string, patch: Partial<Bubble>) {
    setBubbles(p => p.map(b => b.id === id ? { ...b, ...patch } : b));
  }

  // Export
  function handleExport() {
    const ew = bgSize.w, eh = bgSize.h;
    const dw = canvasRef.current?.clientWidth ?? ew;
    const scale = ew / dw;
    const cv = document.createElement("canvas");
    cv.width = ew; cv.height = eh;
    const ctx = cv.getContext("2d")!;
    const finish = () => {
      for (const b of bubbles) drawBubble(ctx, b, ew, eh, scale);
      const a = document.createElement("a");
      a.download = "enkhverse-page.png";
      a.href = cv.toDataURL("image/png");
      a.click();
    };
    if (bgUrl) {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => { ctx.drawImage(img, 0, 0, ew, eh); finish(); };
      img.onerror = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ew, eh); finish(); };
      img.src = bgUrl;
    } else {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, ew, eh); finish();
    }
  }

  const aspect = bgSize.h / bgSize.w;

  const topBtn = (active?: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", transition: "all 120ms ease",
    border: `1.5px solid ${active ? "rgba(94,99,87,0.42)" : "rgba(94,99,87,0.18)"}`,
    background: active ? "rgba(94,99,87,0.10)" : "rgba(255,255,255,0.80)",
    color: active ? "var(--accent)" : "var(--text)",
  });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f3ef", overflow: "hidden" }}>

      {/* ── Topbar ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 18px", height: 50, flexShrink: 0,
        background: "rgba(250,249,246,0.97)",
        borderBottom: "1px solid rgba(94,99,87,0.11)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href={`/${locale}/studio`}
            style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6.5 1.5L2.5 5L6.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Studio
          </Link>
          <div style={{ width: 1, height: 16, background: "rgba(94,99,87,0.18)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
            Page Editor
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} style={topBtn()}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M2.5 4.5L6 1l3.5 3.5M1 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Upload image
          </button>
          <button onClick={handleExport}
            style={{ ...topBtn(), background: "var(--accent)", color: "#f8f7f3", border: "none" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M2.5 7.5L6 11l3.5-3.5M1 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export PNG
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left panel ── */}
        <aside style={{
          width: 168, flexShrink: 0, padding: "16px 11px",
          background: "rgba(250,249,246,0.97)",
          borderRight: "1px solid rgba(94,99,87,0.09)",
          display: "flex", flexDirection: "column", gap: 0, overflowY: "auto",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 9 }}>Tools</div>

          {/* Select / Add toggle */}
          <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
            {(["select","add"] as const).map(t => (
              <button key={t} onClick={() => setTool(t)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: `1.5px solid ${tool === t ? "rgba(94,99,87,0.48)" : "rgba(94,99,87,0.13)"}`,
                  background: tool === t ? "rgba(94,99,87,0.10)" : "transparent",
                  color: tool === t ? "var(--accent)" : "var(--muted)", cursor: "pointer",
                }}>
                {t === "select" ? "Select" : "+ Add"}
              </button>
            ))}
          </div>

          {/* Bubble style picker */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Bubble style</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(["round","box","thought","shout"] as BubbleStyle[]).map(s => {
              const active = addSty === s && tool === "add";
              return (
                <button key={s} onClick={() => { setAddSty(s); setTool("add"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 10, fontSize: 12, fontWeight: 500, textAlign: "left",
                    border: `1.5px solid ${active ? "rgba(94,99,87,0.45)" : "rgba(94,99,87,0.11)"}`,
                    background: active ? "rgba(94,99,87,0.09)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted)",
                    cursor: "pointer", transition: "all 100ms ease",
                  }}>
                  <span style={{ fontSize: 15, lineHeight: 1 }}>
                    {s === "round" ? "○" : s === "box" ? "□" : s === "thought" ? "☁" : "✦"}
                  </span>
                  {STYLE_LABELS[s]}
                </button>
              );
            })}
          </div>

          {tool === "add" && (
            <div style={{
              marginTop: 11, padding: "8px 10px", borderRadius: 9, fontSize: 11,
              background: "rgba(94,99,87,0.07)", color: "var(--accent)",
              border: "1.5px dashed rgba(94,99,87,0.22)", textAlign: "center", lineHeight: 1.4,
            }}>
              Click canvas to place
            </div>
          )}

          {/* Shortcuts */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Shortcuts</div>
            {[["Del","Delete bubble"],["Esc","Deselect / cancel"],["Dbl-click","Edit text"]].map(([key, lbl]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <code style={{ fontSize: 10, background: "rgba(94,99,87,0.09)", borderRadius: 4, padding: "1px 5px", color: "var(--text)" }}>{key}</code>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{lbl}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Canvas area ── */}
        <main style={{
          flex: 1, overflow: "auto",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "28px 20px",
          background: "rgba(210,206,198,0.45)",
        }}>
          <div
            ref={canvasRef}
            onClick={handleCanvasBg}
            style={{
              position: "relative",
              width: "100%", maxWidth: 660,
              aspectRatio: `1 / ${aspect}`,
              cursor: tool === "add" ? "crosshair" : "default",
              background: "#ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.07), 0 12px 48px rgba(0,0,0,0.16), 0 1px 0 rgba(255,255,255,0.8) inset",
              borderRadius: 3, flexShrink: 0,
            }}
          >
            {/* Background image */}
            {bgUrl && (
              <img src={bgUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", borderRadius: 3, display: "block" }} />
            )}

            {/* Empty state */}
            {!bgUrl && bubbles.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none" }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ opacity: 0.20 }}>
                  <rect x="3" y="6" width="30" height="24" rx="3" stroke="var(--accent)" strokeWidth="1.5"/>
                  <circle cx="12" cy="14" r="3.5" stroke="var(--accent)" strokeWidth="1.5"/>
                  <path d="M3 25l8-7 6 5.5 5-4.5 11 9" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                <p style={{ fontSize: 12, color: "rgba(94,99,87,0.40)", textAlign: "center", maxWidth: 170, lineHeight: 1.55 }}>
                  Upload a manga page, or click "+ Add" then click here to place bubbles
                </p>
              </div>
            )}

            {/* Bubbles */}
            {bubbles.map(b => (
              <BubbleNode
                key={b.id} b={b}
                selected={selId === b.id} editing={editId === b.id}
                onMouseDown={onBubbleDown}
                onResizeDown={onResizeDown}
                onDblClick={id => setEditId(id)}
                onTextChange={(id, text) => updateBubble(id, { text })}
                onBlur={() => setEditId(null)}
              />
            ))}
          </div>
        </main>

        {/* ── Right panel ── */}
        <aside style={{
          width: 196, flexShrink: 0,
          background: "rgba(250,249,246,0.97)",
          borderLeft: "1px solid rgba(94,99,87,0.09)",
          overflowY: "auto",
        }}>
          {sel ? (
            <PropsPanel
              b={sel}
              onChange={patch => updateBubble(sel.id, patch)}
              onDelete={() => { setBubbles(p => p.filter(b => b.id !== sel.id)); setSelId(null); }}
            />
          ) : (
            <div style={{ padding: "24px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.65 }}>
                Select a bubble to edit its style, font, and colors
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
