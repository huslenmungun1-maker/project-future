"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  language: string | null;
  archived: boolean;
  featured: boolean;
  published: boolean;
};

export default function AdminHomePage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const base = supabase
      .from("series")
      .select("id,title,description,created_at,language,archived,featured,published")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data, error } =
      q.trim().length > 0 ? await base.ilike("title", `%${q.trim()}%`) : await base;

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as SeriesRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setFlags(
    seriesId: string,
    patch: Partial<Pick<SeriesRow, "archived" | "featured" | "published">>
  ) {
    setBusyId(seriesId);
    setError(null);

    const { error } = await supabase.rpc("admin_set_series_flags", {
      p_series_id: seriesId,
      p_archived: patch.archived ?? null,
      p_featured: patch.featured ?? null,
      p_published: patch.published ?? null,
    });

    if (error) {
      setError(error.message);
      setBusyId(null);
      return;
    }

    setRows((prev) =>
      prev.map((r) => (r.id === seriesId ? { ...r, ...patch } : r))
    );
    setBusyId(null);
  }

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin</h1>
            <p className="text-sm text-slate-400">
              Control room — manage series flags (archive/feature/publish).
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search series title…"
              className="w-full rounded border border-slate-800 bg-black/40 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <button
              onClick={load}
              className="rounded border border-slate-700 bg-black/40 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              Search
            </button>
          </div>

          {error && (
            <div className="rounded border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-400">No results.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-800 bg-black/30 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold line-clamp-1">{r.title}</div>
                      {r.description && (
                        <div className="text-xs text-slate-400 line-clamp-2">
                          {r.description}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 shrink-0">
                      {r.language || locale}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setFlags(r.id, { archived: !r.archived })}
                      className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
                    >
                      {r.archived ? "Unarchive" : "Archive"}
                    </button>

                    <button
                      disabled={busyId === r.id}
                      onClick={() => setFlags(r.id, { featured: !r.featured })}
                      className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
                    >
                      {r.featured ? "Unfeature" : "Feature"}
                    </button>

                    <button
                      disabled={busyId === r.id}
                      onClick={() => setFlags(r.id, { published: !r.published })}
                      className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
                    >
                      {r.published ? "Unpublish" : "Publish"}
                    </button>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500">
                    Flags:{" "}
                    <span className="text-slate-300">
                      {r.archived ? "archived " : ""}
                      {r.featured ? "featured " : ""}
                      {r.published ? "published " : ""}
                      {!r.archived && !r.featured && !r.published ? "none" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}