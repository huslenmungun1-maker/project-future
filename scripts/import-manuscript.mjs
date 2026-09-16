#!/usr/bin/env node
// Import a manuscript into a series' Book Editor chapters/pages.
//
// Usage:
//   node scripts/import-manuscript.mjs <series-id> <folder> [flags]
//
// <folder> contents decide the parsing mode:
//   - Multiple .txt/.md files  -> one file per chapter, sorted alphanumerically
//                                 (e.g. chapter-01.txt ... chapter-08.txt).
//   - A single .txt/.md file   -> split on "Chapter N" header lines, e.g.
//                                 "Chapter 1", "Chapter 1: The Café".
// Per-chapter file mode also honors an optional leading "# Title" line to
// override the chapter title.
//
// Flags:
//   --dry-run    preview chapter/page counts, no writes
//   --replace    wipe + reinsert pages for every chapter found
//                (default: skip chapters that already have pages)
//
// Pagination mirrors the Book Editor's page-fitting logic (same
// PAGE_SIZE_PX box sizes, and the series' own book_styles — font size,
// line height, margins) but estimates line-wrapping by average character
// width instead of real DOM layout, since this runs outside a browser.
// It's an estimate: paragraphs are never split across pages, so results
// may drift slightly from the live editor and can need minor touch-up
// there, same as the old word-count-only import.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = join(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

// Mirrors PAGE_SIZE_PX / DEFAULT_STYLES in
// app/[locale]/studio/series/[id]/book-editor/page.tsx — keep in sync.
const PAGE_SIZE_PX = {
  A4:        { width: 793.7, height: 1122.5 },
  A5:        { width: 559.4, height: 793.7  },
  Paperback: { width: 528,   height: 816    },
  Letter:    { width: 816,   height: 1056   },
};

const DEFAULT_STYLES = {
  fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 2,
  marginH: 72, marginV: 72,
};

// Average glyph width as a fraction of font-size, per font family — serif
// book fonts average narrower than the em box; sans-serif UI fonts wider.
// Rough constants (no real layout available in Node), tuned against Georgia.
function avgCharWidthRatio(fontFamily) {
  if (/system-ui|sans-serif/i.test(fontFamily) && !/serif/i.test(fontFamily.split(",")[0])) return 0.52;
  return 0.5;
}

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith("--"));
const SERIES_ID = positional[0];
const SOURCE = positional[1];
const DRY_RUN = args.includes("--dry-run");
const REPLACE = args.includes("--replace");
const ONLY = (() => {
  const raw = args.find(a => a.startsWith("--only="))?.split("=")[1];
  if (!raw) return null;
  const set = new Set();
  for (const part of raw.split(",")) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) set.add(n);
    } else if (/^\d+$/.test(part)) {
      set.add(Number(part));
    }
  }
  return set;
})();

if (!SERIES_ID || !SOURCE) {
  console.error(
    "Usage: node scripts/import-manuscript.mjs <series-id> <folder> [--dry-run] [--replace] [--only=3-8]"
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A chapter's intro page (page_number 0) starts as a single centered
// title text-block — same TextBlock/IntroDesign JSON shape the Book
// Editor's addChapter()/runImport() write (see defaultIntroContent there).
function defaultIntroContent(title) {
  return JSON.stringify({
    blocks: [{
      // Intro-block text renders as HTML (rich text) — escape a plain
      // chapter title so stray <, >, & display literally.
      id: "title", type: "title", text: escapeHtml(title),
      x: 50, y: 50, fontSize: 32, rotation: 0,
      color: "#1a1a1a", align: "center", bold: true,
    }],
  });
}

function paragraphsFromBody(body) {
  return body
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// One file per chapter. Optional leading "# Title" line sets chapter title.
function parseChapterFile(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let title = null;
  let bodyStart = 0;
  if (lines[0]?.trim().startsWith("# ")) {
    title = lines[0].trim().slice(2).trim();
    bodyStart = 1;
  }
  return { title, paragraphs: paragraphsFromBody(lines.slice(bodyStart).join("\n").trim()) };
}

// Single file, chapters split on "Chapter N[: Title]" header lines.
const CHAPTER_HEADER_RE = /^chapter\s+(\d+)\s*[:.\-–—]?\s*(.*)$/i;

function parseSingleFileChapters(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const chapters = [];
  let current = null;

  for (const line of lines) {
    const m = line.trim().match(CHAPTER_HEADER_RE);
    if (m) {
      if (current) chapters.push(current);
      current = { number: Number(m[1]), title: m[2].trim() || null, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
    // lines before the first recognized header are discarded (front matter)
  }
  if (current) chapters.push(current);

  return chapters.map(c => ({
    number: c.number,
    title: c.title,
    paragraphs: paragraphsFromBody(c.bodyLines.join("\n").trim()),
  }));
}

// Greedy word-wrap line count for a paragraph at a given character budget
// per line — used to estimate rendered height without real DOM layout.
function estimateLineCount(paragraph, charsPerLine) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  let lines = 1;
  let lineLen = 0;
  for (const word of words) {
    const addLen = lineLen === 0 ? word.length : lineLen + 1 + word.length;
    if (addLen > charsPerLine && lineLen > 0) {
      lines++;
      lineLen = word.length;
    } else {
      lineLen = addLen;
    }
  }
  return lines;
}

// Packs paragraphs into pages using the series' real book_styles/page_size,
// estimating each paragraph's rendered height via word-wrap line count.
// Never splits a paragraph across pages, and never leaves a page empty
// (mirrors splitHtmlToFit's behavior in the Book Editor).
function paginate(paragraphs, box, styles) {
  const fillWidth  = box.width  - 2 * styles.marginH;
  const fillHeight = box.height - 2 * styles.marginV;
  const charsPerLine = Math.max(1, Math.floor(fillWidth / (styles.fontSize * avgCharWidthRatio(styles.fontFamily))));
  const lineHeightPx = styles.fontSize * styles.lineHeight;
  const linesPerPage = Math.max(1, Math.floor(fillHeight / lineHeightPx));

  const pages = [];
  let current = [];
  let currentLines = 0;

  // Each paragraph after the first on a page costs one extra rendered line
  // for the blank-line divider between paragraphs (see HTML shape below).
  for (const para of paragraphs) {
    const paraLines = estimateLineCount(para, charsPerLine);
    const costIfSamePage = current.length > 0 ? paraLines + 1 : paraLines;
    if (current.length > 0 && currentLines + costIfSamePage > linesPerPage) {
      pages.push(current);
      current = [];
      currentLines = 0;
    }
    current.push(para);
    currentLines += current.length > 1 ? paraLines + 1 : paraLines;
  }
  if (current.length > 0) pages.push(current);

  // Matches the Book Editor's own contentEditable output shape — each
  // paragraph as its own <div>, with an empty "<div><br></div>" line
  // between them for visible paragraph spacing (a bare join of <p> tags
  // with no separator, as this used to do, rendered with zero gap).
  return pages.map(paras =>
    paras.map(p => `<div>${escapeHtml(p)}</div>`).join("<div><br></div>")
  );
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`);
    process.exit(1);
  }

  const { data: series, error: seriesErr } = await supabase
    .from("series")
    .select("id, title, page_size, book_styles")
    .eq("id", SERIES_ID)
    .maybeSingle();
  if (seriesErr) throw seriesErr;
  if (!series) {
    console.error(`Series not found: ${SERIES_ID}`);
    process.exit(1);
  }

  const box = PAGE_SIZE_PX[series.page_size] ?? PAGE_SIZE_PX.A4;
  const styles = { ...DEFAULT_STYLES, ...(series.book_styles || {}) };

  let chapterInputs; // { number, title, paragraphs }[]

  const isDir = statSync(SOURCE).isDirectory();
  if (isDir) {
    const files = readdirSync(SOURCE)
      .filter(f => f.endsWith(".txt") || f.endsWith(".md"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (files.length === 0) {
      console.error(`No .txt/.md files found in ${SOURCE}`);
      process.exit(1);
    }
    if (files.length === 1) {
      chapterInputs = parseSingleFileChapters(readFileSync(join(SOURCE, files[0]), "utf8"));
    } else {
      chapterInputs = files.map((f, i) => {
        const { title, paragraphs } = parseChapterFile(readFileSync(join(SOURCE, f), "utf8"));
        return { number: i + 1, title, paragraphs };
      });
    }
  } else {
    chapterInputs = parseSingleFileChapters(readFileSync(SOURCE, "utf8"));
  }

  chapterInputs = chapterInputs.filter(c => c.paragraphs.length > 0).sort((a, b) => a.number - b.number);
  if (ONLY) chapterInputs = chapterInputs.filter(c => ONLY.has(c.number));

  if (chapterInputs.length === 0) {
    console.error("No chapters parsed from source — check the header format, file contents, or --only filter.");
    process.exit(1);
  }

  console.log(`Series: "${series.title}" (${series.id})  page_size=${series.page_size}`);
  console.log(`Found ${chapterInputs.length} chapter(s) from ${SOURCE}${ONLY ? `  (--only=${[...ONLY].join(",")})` : ""}`);
  console.log(`dry-run=${DRY_RUN}  replace=${REPLACE}\n`);

  const { data: existingChapters, error: chErr } = await supabase
    .from("chapters")
    .select("id, chapter_number, title")
    .eq("series_id", SERIES_ID)
    .order("chapter_number", { ascending: true });
  if (chErr) throw chErr;

  for (const input of chapterInputs) {
    const chapterTitle = input.title || `Chapter ${input.number}`;
    const pagesHtml = paginate(input.paragraphs, box, styles);

    console.log(
      `[Ch.${input.number}] "${chapterTitle}" — ${input.paragraphs.length} paragraphs -> ${pagesHtml.length} page(s)`
    );

    if (DRY_RUN) continue;

    let chapter = existingChapters.find(c => c.chapter_number === input.number);
    if (!chapter) {
      const { data: newCh, error: insErr } = await supabase
        .from("chapters")
        .insert({
          series_id: SERIES_ID,
          chapter_number: input.number,
          title: chapterTitle,
          content: "", // chapters.content is NOT NULL — never pass null here
          is_published: false,
        })
        .select("id, chapter_number, title")
        .single();
      if (insErr) throw insErr;
      chapter = newCh;
      existingChapters.push(chapter);
      console.log(`  created chapter ${chapter.id}`);
    } else if (chapter.title !== chapterTitle) {
      await supabase.from("chapters").update({ title: chapterTitle }).eq("id", chapter.id);
      console.log(`  updated title on existing chapter ${chapter.id}`);
    }

    if (REPLACE) {
      const { error: delErr } = await supabase.from("pages").delete().eq("chapter_id", chapter.id);
      if (delErr) throw delErr;
    } else {
      const { data: existingPages } = await supabase
        .from("pages").select("id").eq("chapter_id", chapter.id).limit(1);
      if (existingPages && existingPages.length > 0) {
        console.log(`  chapter already has pages — skipping (use --replace to overwrite)`);
        continue;
      }
    }

    const rows = [
      { chapter_id: chapter.id, page_number: 0, content: defaultIntroContent(chapterTitle) },
      ...pagesHtml.map((html, idx) => ({ chapter_id: chapter.id, page_number: idx + 1, content: html })),
    ];

    const { error: pgErr } = await supabase.from("pages").insert(rows);
    if (pgErr) throw pgErr;
    console.log(`  inserted ${rows.length} page(s)`);
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
