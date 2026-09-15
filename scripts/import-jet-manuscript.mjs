#!/usr/bin/env node
// One-time import: JET manuscript (8 chapters) -> chapters + pages rows.
//
// Usage:
//   node scripts/import-jet-manuscript.mjs --dry-run          preview page counts, no writes
//   node scripts/import-jet-manuscript.mjs                    import (skips chapters that already have pages)
//   node scripts/import-jet-manuscript.mjs --replace          wipe + reinsert pages for every chapter file present
//   node scripts/import-jet-manuscript.mjs --words-per-page=380
//
// Drop chapter files: scripts/manuscript/chapter-01.txt ... chapter-08.txt
// (any filenames are fine — they're sorted alphanumerically and mapped to
// chapter 1, 2, 3... in that order). Plain text, blank line between
// paragraphs. Optionally make the first line "# Chapter Title" to set a
// custom chapter title; otherwise it defaults to "Chapter N".

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "fs";
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

const SERIES_ID = "550bc02d-0eda-4036-840e-67919980ec7c"; // JET
const MANUSCRIPT_DIR = join(__dirname, "manuscript");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const REPLACE = args.includes("--replace");
const WORDS_PER_PAGE = Number(
  args.find(a => a.startsWith("--words-per-page="))?.split("=")[1] ?? 450
);

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

// First line "# Title" (optional) sets the chapter title; body paragraphs
// are separated by one or more blank lines.
function parseChapterFile(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let title = null;
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

// Groups paragraphs into pages by a word budget, never splitting a
// paragraph across pages. Approximate — meant to give a reasonable
// starting layout the user can fine-tune in the Book Editor.
function paginate(paragraphs, wordsPerPage) {
  const pages = [];
  let current = [];
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

async function main() {
  if (!existsSync(MANUSCRIPT_DIR)) {
    console.error(
      `Manuscript folder not found: ${MANUSCRIPT_DIR}\n` +
      `Create it and drop chapter-01.txt ... chapter-08.txt there.`
    );
    process.exit(1);
  }

  const files = readdirSync(MANUSCRIPT_DIR)
    .filter(f => f.endsWith(".txt") || f.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    console.error(`No .txt/.md files found in ${MANUSCRIPT_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} chapter file(s): ${files.join(", ")}`);
  console.log(`words-per-page=${WORDS_PER_PAGE}  dry-run=${DRY_RUN}  replace=${REPLACE}\n`);

  const { data: existingChapters, error: chErr } = await supabase
    .from("chapters")
    .select("id, chapter_number, title")
    .eq("series_id", SERIES_ID)
    .order("chapter_number", { ascending: true });
  if (chErr) throw chErr;

  for (let i = 0; i < files.length; i++) {
    const chapterNumber = i + 1;
    const filePath = join(MANUSCRIPT_DIR, files[i]);
    const raw = readFileSync(filePath, "utf8");
    const { title, paragraphs } = parseChapterFile(raw);
    const chapterTitle = title || `Chapter ${chapterNumber}`;
    const pagesHtml = paginate(paragraphs, WORDS_PER_PAGE);

    console.log(
      `[Ch.${chapterNumber}] "${chapterTitle}" — ${files[i]} — ` +
      `${paragraphs.length} paragraphs -> ${pagesHtml.length} page(s)`
    );

    if (DRY_RUN) continue;

    let chapter = existingChapters.find(c => c.chapter_number === chapterNumber);
    if (!chapter) {
      const { data: newCh, error: insErr } = await supabase
        .from("chapters")
        .insert({
          series_id: SERIES_ID,
          chapter_number: chapterNumber,
          title: chapterTitle,
          content: "", // chapters.content is NOT NULL — never pass null here
          is_published: false,
        })
        .select("id, chapter_number, title")
        .single();
      if (insErr) throw insErr;
      chapter = newCh;
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

    const rows = pagesHtml.map((html, idx) => ({
      chapter_id: chapter.id,
      page_number: idx + 1,
      content: html,
    }));

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
