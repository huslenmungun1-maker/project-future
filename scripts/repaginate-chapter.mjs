#!/usr/bin/env node
// Re-flow a chapter's existing pages against the series' current
// book_styles/page_size — for when font size, line height, or margins
// change after content was already paginated (e.g. a global font-size
// bump leaves old pages under-filled or overflowing).
//
// Preserves the exact original top-level node sequence (paragraph divs
// AND blank-line spacer divs, in original order, byte-for-byte) and only
// changes which nodes land on which page — it does not touch wording,
// reorder nodes, or normalize spacing between them.
//
// Usage:
//   node scripts/repaginate-chapter.mjs <series-id> --only=1,2 [--dry-run]
//   node scripts/repaginate-chapter.mjs <series-id>               (all chapters)

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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

function avgCharWidthRatio(fontFamily) {
  if (/system-ui|sans-serif/i.test(fontFamily) && !/serif/i.test(fontFamily.split(",")[0])) return 0.52;
  return 0.5;
}

const args = process.argv.slice(2);
const SERIES_ID = args.find(a => !a.startsWith("--"));
const DRY_RUN = args.includes("--dry-run");
const ONLY = (() => {
  const raw = args.find(a => a.startsWith("--only="))?.split("=")[1];
  if (!raw) return null;
  const set = new Set();
  for (const part of raw.split(",")) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) for (let n = Number(range[1]); n <= Number(range[2]); n++) set.add(n);
    else if (/^\d+$/.test(part)) set.add(Number(part));
  }
  return set;
})();

if (!SERIES_ID) {
  console.error("Usage: node scripts/repaginate-chapter.mjs <series-id> [--only=1,2] [--dry-run]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function estimateLineCount(plainText, charsPerLine) {
  const words = plainText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  let lines = 1, lineLen = 0;
  for (const word of words) {
    const addLen = lineLen === 0 ? word.length : lineLen + 1 + word.length;
    if (addLen > charsPerLine && lineLen > 0) { lines++; lineLen = word.length; }
    else lineLen = addLen;
  }
  return lines;
}

const DIV_RE = /<div\b[^>]*>[\s\S]*?<\/div>/g;

// Splits stored page HTML into its exact top-level node sequence —
// content divs AND spacer "<div><br></div>" divs alike, in original
// order, byte-for-byte. Deliberately does NOT drop spacer nodes or
// normalize spacing: whether two paragraphs originally had a blank-line
// divider between them (or none, e.g. tight back-to-back dialogue) is
// part of the content, not an artifact to regenerate. Any text found
// outside a <div> wrapper (browsers can leave the very first line of a
// freshly-typed contentEditable div unwrapped) is recovered as its own
// node rather than silently dropped — this is exactly the bug that ate
// the opening line of chapter 1 on the first version of this script.
function extractNodes(html) {
  const nodes = [];
  let lastIndex = 0;
  let m;
  DIV_RE.lastIndex = 0;
  while ((m = DIV_RE.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const between = html.slice(lastIndex, m.index);
      if (between.trim() !== "") {
        nodes.push(`<div>${between.trim()}</div>`);
        console.log(`    (recovered unwrapped text outside a <div>: ${JSON.stringify(between.trim().slice(0, 60))})`);
      }
    }
    nodes.push(m[0]);
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) {
    const tail = html.slice(lastIndex);
    if (tail.trim() !== "") {
      nodes.push(`<div>${tail.trim()}</div>`);
      console.log(`    (recovered unwrapped trailing text: ${JSON.stringify(tail.trim().slice(0, 60))})`);
    }
  }

  const coveredLen = nodes.join("").length;
  if (html.length > 0 && coveredLen < html.length * 0.999) {
    throw new Error(
      `Node extraction only covered ${coveredLen}/${html.length} chars — unrecognized markup shape, aborting to avoid data loss.`
    );
  }
  return nodes;
}

// Repacks the exact original node sequence across new page boundaries —
// same granularity as the Book Editor's splitHtmlToFit (never splits a
// node, never leaves a page empty), but never invents, drops, or
// reorders a node. Concatenated with no separator: each node (content
// or spacer) is already a self-contained <div>...</div>, exactly as
// stored originally.
function repaginate(nodes, box, styles) {
  const fillWidth  = box.width  - 2 * styles.marginH;
  const fillHeight = box.height - 2 * styles.marginV;
  const charsPerLine = Math.max(1, Math.floor(fillWidth / (styles.fontSize * avgCharWidthRatio(styles.fontFamily))));
  const lineHeightPx = styles.fontSize * styles.lineHeight;
  const linesPerPage = Math.max(1, Math.floor(fillHeight / lineHeightPx));

  const pages = [];
  let current = [];
  let currentLines = 0;

  for (const node of nodes) {
    const plain = node.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const nodeLines = Math.max(1, estimateLineCount(plain, charsPerLine));
    if (current.length > 0 && currentLines + nodeLines > linesPerPage) {
      pages.push(current);
      current = [];
      currentLines = 0;
    }
    current.push(node);
    currentLines += nodeLines;
  }
  if (current.length > 0) pages.push(current);

  return pages.map(ns => ns.join(""));
}

async function main() {
  const { data: series, error: seriesErr } = await supabase
    .from("series").select("id, title, page_size, book_styles").eq("id", SERIES_ID).maybeSingle();
  if (seriesErr) throw seriesErr;
  if (!series) { console.error(`Series not found: ${SERIES_ID}`); process.exit(1); }

  const box = PAGE_SIZE_PX[series.page_size] ?? PAGE_SIZE_PX.A4;
  const styles = { ...DEFAULT_STYLES, ...(series.book_styles || {}) };

  let { data: chapters, error: chErr } = await supabase
    .from("chapters").select("id, chapter_number, title").eq("series_id", SERIES_ID).order("chapter_number");
  if (chErr) throw chErr;
  if (ONLY) chapters = chapters.filter(c => ONLY.has(c.chapter_number));

  console.log(`Series: "${series.title}" (${series.id})  page_size=${series.page_size}  fontSize=${styles.fontSize} lineHeight=${styles.lineHeight}`);
  console.log(`Repaginating ${chapters.length} chapter(s)${DRY_RUN ? " (dry-run)" : ""}\n`);

  for (const ch of chapters) {
    const { data: pages, error: pgErr } = await supabase
      .from("pages").select("id, page_number, content").eq("chapter_id", ch.id).order("page_number");
    if (pgErr) throw pgErr;
    if (!pages || pages.length === 0) { console.log(`[Ch.${ch.chapter_number}] no pages — skipping`); continue; }

    // No separator between pages: a page break is just where the physical
    // sheet ended, not an implied paragraph gap — the node stream is
    // continuous across it.
    const combinedHtml = pages.map(p => p.content || "").join("");
    let nodes;
    try {
      nodes = extractNodes(combinedHtml);
    } catch (e) {
      console.log(`[Ch.${ch.chapter_number}] SKIPPED — ${e.message}`);
      continue;
    }

    const newPagesHtml = repaginate(nodes, box, styles);
    console.log(`[Ch.${ch.chapter_number}] "${ch.title}" — ${pages.length} page(s) -> ${newPagesHtml.length} page(s)`);

    if (DRY_RUN) continue;

    const { error: delErr } = await supabase.from("pages").delete().eq("chapter_id", ch.id);
    if (delErr) throw delErr;

    const rows = newPagesHtml.map((html, idx) => ({ chapter_id: ch.id, page_number: idx + 1, content: html }));
    const { error: insErr } = await supabase.from("pages").insert(rows);
    if (insErr) throw insErr;
    console.log(`  replaced with ${rows.length} page(s)`);
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error("Repagination failed:", err);
  process.exit(1);
});
