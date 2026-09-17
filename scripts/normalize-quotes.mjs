#!/usr/bin/env node
// One-time pass: convert straight quotes to typographic curly quotes across
// every stored page for a series (regular pages' HTML content, and intro
// pages' JSON block text). Glyph substitution only — word counts must stay
// identical before/after, verified per page.
//
// Usage:
//   node scripts/normalize-quotes.mjs <series-id> [--dry-run]

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { smartenHtml } from "./smart-quotes.mjs";

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

const args = process.argv.slice(2);
const SERIES_ID = args.find(a => !a.startsWith("--"));
const DRY_RUN = args.includes("--dry-run");

if (!SERIES_ID) {
  console.error("Usage: node scripts/normalize-quotes.mjs <series-id> [--dry-run]");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function wordCount(plainish) {
  return plainish.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
}

async function main() {
  const { data: chapters, error: chErr } = await supabase
    .from("chapters")
    .select("id, chapter_number, title")
    .eq("series_id", SERIES_ID)
    .order("chapter_number", { ascending: true });
  if (chErr) throw chErr;
  if (!chapters || chapters.length === 0) {
    console.error(`No chapters found for series ${SERIES_ID}`);
    process.exit(1);
  }

  const chapterIds = chapters.map(c => c.id);
  const { data: pages, error: pgErr } = await supabase
    .from("pages")
    .select("id, chapter_id, page_number, content")
    .in("chapter_id", chapterIds)
    .order("page_number", { ascending: true });
  if (pgErr) throw pgErr;

  console.log(`Series ${SERIES_ID}: ${chapters.length} chapter(s), ${pages.length} page(s). dry-run=${DRY_RUN}\n`);

  let changed = 0, unchanged = 0, mismatches = 0;
  let totalWordsBefore = 0, totalWordsAfter = 0;

  for (const page of pages) {
    if (page.content == null) { unchanged++; continue; }

    const before = page.content;
    const wordsBefore = wordCount(before);
    let after;

    if (page.page_number === 0) {
      let design;
      try {
        design = JSON.parse(before);
      } catch {
        console.warn(`  [skip] page ${page.id} (chapter ${page.chapter_id}) — intro content isn't valid JSON`);
        unchanged++;
        continue;
      }
      for (const block of design.blocks || []) {
        block.text = smartenHtml(block.text);
      }
      after = JSON.stringify(design);
    } else {
      after = smartenHtml(before);
    }

    const wordsAfter = wordCount(after);
    totalWordsBefore += wordsBefore;
    totalWordsAfter += wordsAfter;

    if (wordsBefore !== wordsAfter) {
      console.warn(`  [MISMATCH] page ${page.id} — words ${wordsBefore} -> ${wordsAfter}, skipping write`);
      mismatches++;
      continue;
    }

    if (after === before) {
      unchanged++;
      continue;
    }

    changed++;
    if (!DRY_RUN) {
      const { error: upErr } = await supabase.from("pages").update({ content: after }).eq("id", page.id);
      if (upErr) throw upErr;
    }
  }

  console.log(`\nchanged=${changed}  unchanged=${unchanged}  mismatches=${mismatches}`);
  console.log(`total words before=${totalWordsBefore}  after=${totalWordsAfter}`);
  if (mismatches > 0) {
    console.error(`\n${mismatches} page(s) had a word-count mismatch and were left untouched — investigate before re-running.`);
    process.exitCode = 1;
  } else {
    console.log(DRY_RUN ? "\nDry run only — no writes made." : "\nDone.");
  }
}

main().catch(err => {
  console.error("normalize-quotes failed:", err);
  process.exit(1);
});
