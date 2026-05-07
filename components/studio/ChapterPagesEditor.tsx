"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.03)";
const TEXT = "#eceae4";
const MUTED = "#7a7870";
const ACCENT = "#b6a07c";
const DANGER = "#c97a6a";
const BUCKET = "chapter-pages";

type PageRow = {
  id: string;
  order_index: number;
  image_url: string;
};

export default function ChapterPagesEditor({ chapterId }: { chapterId: string }) {
  const supabase = createClientComponentClient();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ok">("loading");

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase
        .from("chapter_pages")
        .select("id,order_index,image_url")
        .eq("chapter_id", chapterId)
        .order("order_index", { ascending: true });
      if (alive) {
        setPages((data as PageRow[]) || []);
        setLoadStatus("ok");
      }
    }
    load();
    return () => { alive = false; };
  }, [chapterId, supabase]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError(null);

    const nextIndex = pages.length > 0 ? Math.max(...pages.map(p => p.order_index)) + 1 : 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `chapters/${chapterId}/${Date.now()}_${i}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false, cacheControl: "3600", contentType: file.type,
      });

      if (upErr) { setError(upErr.message); setUploading(false); e.target.value = ""; return; }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) { setError("Could not get public URL"); setUploading(false); e.target.value = ""; return; }

      const { data: row, error: insErr } = await supabase
        .from("chapter_pages")
        .insert({ chapter_id: chapterId, order_index: nextIndex + i, image_url: url })
        .select("id,order_index,image_url")
        .maybeSingle();

      if (insErr || !row) { setError(insErr?.message || "Insert failed"); setUploading(false); e.target.value = ""; return; }

      setPages(prev => [...prev, row as PageRow]);
    }

    setUploading(false);
    e.target.value = "";
  }

  async function deletePage(page: PageRow) {
    if (!confirm("Delete this page?")) return;

    const pathMatch = page.image_url.split(`${BUCKET}/`)[1];
    if (pathMatch) {
      await supabase.storage.from(BUCKET).remove([pathMatch]);
    }

    await supabase.from("chapter_pages").delete().eq("id", page.id);
    setPages(prev => prev.filter(p => p.id !== page.id));
  }

  async function movePage(page: PageRow, direction: "up" | "down") {
    const sorted = [...pages].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(p => p.id === page.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swap = sorted[swapIdx];
    const newOrder = sorted[idx].order_index;
    const swapOrder = sorted[swapIdx].order_index;

    await Promise.all([
      supabase.from("chapter_pages").update({ order_index: swapOrder }).eq("id", page.id),
      supabase.from("chapter_pages").update({ order_index: newOrder }).eq("id", swap.id),
    ]);

    setPages(prev => prev.map(p => {
      if (p.id === page.id) return { ...p, order_index: swapOrder };
      if (p.id === swap.id) return { ...p, order_index: newOrder };
      return p;
    }));
  }

  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);

  if (loadStatus === "loading") {
    return <p style={{ color: MUTED, fontSize: 13 }}>Loading pages…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Upload button */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 24px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Pages — {sortedPages.length} uploaded
        </p>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 9999, cursor: uploading ? "not-allowed" : "pointer",
          background: uploading ? "rgba(182,160,124,0.4)" : ACCENT,
          color: "#0a0a0c", fontSize: 13, fontWeight: 700,
          opacity: uploading ? 0.6 : 1,
        }}>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          {uploading ? "Uploading…" : "Upload pages"}
        </label>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
          Select multiple images at once. Order is preserved.
        </p>
        {error && <p style={{ fontSize: 11, color: DANGER, marginTop: 8 }}>{error}</p>}
      </div>

      {/* Page grid */}
      {sortedPages.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {sortedPages.map((page, i) => (
            <div
              key={page.id}
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`,
                borderRadius: 12, overflow: "hidden",
                position: "relative",
              }}
            >
              <img
                src={page.image_url}
                alt={`Page ${i + 1}`}
                style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }}
              />
              <div style={{
                padding: "6px 8px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>P{i + 1}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {i > 0 && (
                    <button
                      onClick={() => movePage(page, "up")}
                      style={{ fontSize: 10, color: TEXT, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                      title="Move up"
                    >
                      ↑
                    </button>
                  )}
                  {i < sortedPages.length - 1 && (
                    <button
                      onClick={() => movePage(page, "down")}
                      style={{ fontSize: 10, color: TEXT, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                      title="Move down"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    onClick={() => deletePage(page)}
                    style={{ fontSize: 10, color: DANGER, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
