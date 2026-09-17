// app/api/generate-intro-design/route.ts
// Generates a chapter-intro-page design (blocks + optional page frame) from
// a text prompt and optional reference image, for the Book Editor's "Intro
// Blocks" tab. Mirrors app/api/core-assistant/route.ts's request/error
// shape; see the IntroDesign/TextBlock/Frame types in the book-editor page.
import { NextResponse } from "next/server";

const FONT_FAMILIES = [
  "Georgia, serif",
  "'Merriweather', serif",
  "'Playfair Display', serif",
  "'Lora', serif",
  "system-ui, sans-serif",
] as const;

const FRAME_STYLES = ["solid", "double", "dashed", "dotted", "groove"] as const;
const BLOCK_TYPES = ["title", "subtitle", "author", "text"] as const;
const ALIGNS = ["left", "center", "right"] as const;

type FrameStyle = (typeof FRAME_STYLES)[number];
type Align = (typeof ALIGNS)[number];
type BlockType = (typeof BLOCK_TYPES)[number];

type Frame = { style: FrameStyle; color: string; width: number };
type TextBlock = {
  id: string;
  type: BlockType;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string;
  rotation?: number;
  color: string;
  align: Align;
  bold: boolean;
  frame?: Frame;
};
type IntroDesign = { blocks: TextBlock[]; pageFrame?: Frame };

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, v));
}

function sanitizeColor(c: unknown, fallback: string): string {
  return typeof c === "string" && HEX_RE.test(c) ? c : fallback;
}

function sanitizeFrame(f: unknown): Frame | undefined {
  if (!f || typeof f !== "object") return undefined;
  const raw = f as Record<string, unknown>;
  const style = FRAME_STYLES.includes(raw.style as FrameStyle) ? (raw.style as FrameStyle) : "solid";
  return {
    style,
    color: sanitizeColor(raw.color, "#1a1a1a"),
    width: clamp(raw.width, 1, 16, 2),
  };
}

function sanitizeBlock(raw: unknown, fallbackText: string): TextBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const type = BLOCK_TYPES.includes(b.type as BlockType) ? (b.type as BlockType) : "text";
  const text = typeof b.text === "string" && b.text.trim() ? b.text.trim() : fallbackText;
  if (!text) return null;
  return {
    id: `block-${crypto.randomUUID()}`,
    type,
    text,
    x: clamp(b.x, 0, 100, 50),
    y: clamp(b.y, 0, 100, 50),
    fontSize: clamp(b.fontSize, 10, 96, type === "title" ? 32 : 16),
    fontFamily: FONT_FAMILIES.includes(b.fontFamily as (typeof FONT_FAMILIES)[number])
      ? (b.fontFamily as string)
      : undefined,
    rotation: b.rotation === undefined ? undefined : clamp(b.rotation, -180, 180, 0),
    color: sanitizeColor(b.color, "#1a1a1a"),
    align: ALIGNS.includes(b.align as Align) ? (b.align as Align) : "center",
    bold: Boolean(b.bold),
    frame: sanitizeFrame(b.frame),
  };
}

function sanitizeDesign(raw: unknown, chapterTitle: string): IntroDesign {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : [];
  const blocks = rawBlocks
    .slice(0, 5)
    .map(b => sanitizeBlock(b, chapterTitle))
    .filter((b): b is TextBlock => b !== null);

  if (!blocks.some(b => b.type === "title")) {
    blocks.unshift({
      id: `block-${crypto.randomUUID()}`,
      type: "title",
      text: chapterTitle || "Chapter Title",
      x: 50,
      y: 40,
      fontSize: 32,
      color: "#1a1a1a",
      align: "center",
      bold: true,
    });
  }

  return { blocks: blocks.slice(0, 5), pageFrame: sanitizeFrame(obj.pageFrame) };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const chapterTitle = typeof body?.chapterTitle === "string" ? body.chapterTitle.trim() : "";
    const bookTitle = typeof body?.bookTitle === "string" ? body.bookTitle.trim() : "";
    const referenceImage = typeof body?.referenceImage === "string" ? body.referenceImage : undefined;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
    }

    const systemPrompt = `
You design a single chapter "intro page" — a mostly-empty page with a few styled text blocks (title, maybe a subtitle/author/decorative line) and optionally a decorative border — for a webnovel/manga chapter, based on a short style description from the author.

Respond with ONLY a JSON object of this exact shape (no prose, no markdown fences):
{
  "blocks": [
    {
      "type": "title" | "subtitle" | "author" | "text",
      "text": string,
      "x": number,        // 0-100, % from left
      "y": number,        // 0-100, % from top
      "fontSize": number, // 10-96
      "fontFamily": one of ${JSON.stringify(FONT_FAMILIES)},
      "color": "#rrggbb",
      "align": "left" | "center" | "right",
      "bold": boolean,
      "rotation": number, // optional, -180 to 180, default 0
      "frame": { "style": one of ${JSON.stringify(FRAME_STYLES)}, "color": "#rrggbb", "width": number } // optional, per-block border
    }
  ],
  "pageFrame": { "style": ..., "color": "#rrggbb", "width": number } // optional, whole-page border, same shape as a block's frame
}

Rules:
- 1 to 5 blocks total. Always include exactly one "title" block, and its text must be exactly the chapter title given to you.
- Positions must not overlap and must stay clear of the page edges (roughly 10-90 range).
- Colors must have good contrast against a plain white/cream page background unless the prompt clearly asks for a dark background look (a dark pageFrame plus dark block colors can still work on white paper as a bordered/inset design).
- Interpret the author's prompt as mood/palette/composition/typography guidance only. If they reference an existing published book, movie, franchise, or brand, take only the general *feeling* (e.g. "gritty", "pastel and playful", "old library") — never copy that work's actual logo, exact color codes, specific layout, or any of its real text/branding, and never attempt to reproduce a specific real cover design. Always produce an original layout of your own.
- Output raw JSON only, matching the shape above exactly.
`.trim();

    const userText = [
      bookTitle ? `Book: ${bookTitle}` : null,
      `Chapter title: ${chapterTitle || "Untitled"}`,
      `Style prompt: ${prompt}`,
      referenceImage ? "A reference image is attached for style/mood only — do not copy it literally." : null,
    ]
      .filter(Boolean)
      .join("\n");

    const userContent: unknown[] = [{ type: "text", text: userText }];
    if (referenceImage) {
      userContent.push({ type: "image_url", image_url: { url: referenceImage } });
    }

    const payload = {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userContent },
      ],
      temperature: 0.8,
      max_tokens: 1024,
      response_format: { type: "json_object" as const },
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "OpenAI API error", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const design = sanitizeDesign(parsed, chapterTitle);
    return NextResponse.json({ design });
  } catch (err) {
    console.error("generate-intro-design route error:", err);
    return NextResponse.json(
      { error: "Server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
