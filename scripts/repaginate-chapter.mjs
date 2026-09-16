#!/usr/bin/env node
// Re-flow a chapter's existing pages against the series' current
// book_styles/page_size — for when font size, line height, or margins
// change after content was already paginated (e.g. a global font-size
// bump leaves old pages under-filled or overflowing).
//
// Does NOT touch wording — only re-chunks the same paragraph nodes
// across page boundaries, same as if you'd resaved each page in the
// Book Editor after a style change (that live reflow only ever cascades
// forward from the page you touch; this rebuilds a whole chapter in one
// pass using the same word-wrap line-count estimate as import-manuscript.mjs).
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

// Splits stored page HTML (a flat stream of <div>line</div> nodes, with
// "<div><br></div>" spacers between paragraphs — the Book Editor's own
// contentEditable output shape) into content-node strings, dropping the
// spacer nodes (repacking regenerates spacing between whatever ends up
// adjacent on a page).
function extractContentNodes(html) {
  const matches = html.match(DIV_RE) || [];
  const coveredLen = matches.join("").length;
  if (html.length > 0 && coveredLen < html.length * 0.9) {
    throw new Error(
      `Unrecognized page content shape (only matched ${coveredLen}/${html.length} chars as <div> nodes) — aborting to avoid data loss.`
    );
  }
  return matches.filter(node => {
    const inner = node.replace(/^<div\b[^>]*>/, "").replace(/<\/div>$/, "").trim();
    return inner !== "" && inner !== "<br>" && inner !== "<br/>";
  });
}

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
    const nodeLines = estimateLineCount(plain, charsPerLine);
    const costIfSamePage = current.length > 0 ? nodeLines + 1 : nodeLines;
    if (current.length > 0 && currentLines + costIfSamePage > linesPerPage) {
      pages.push(current);
      current = [];
      currentLines = 0;
    }
    current.push(node);
    currentLines += current.length > 1 ? nodeLines + 1 : nodeLines;
  }
  if (current.length > 0) pages.push(current);

  return pages.map(ns => ns.join("<div><br></div>"));
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

    const combinedHtml = pages.map(p => p.content || "").join("<div><br></div>");
    let nodes;
    try {
      nodes = extractContentNodes(combinedHtml);
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
