"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_image_url: string | null;
  language: string | null;
};

export default function StudioHomePage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [loading, setLoading] = useState(true);
  const [seriesList, setSeriesList] = useState<SeriesRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSeries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("series")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(
          `${error.message}${
            (error as any)?.hint ? ` — ${(error as any).hint}` : ""
          }`
        );
        setSeriesList([]);
        setLoading(false);
        return;
      }

      setSeriesList((data as SeriesRow[]) || []);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Unknown error while loading series.");
      setSeriesList([]);
      setLoading(false);
    }
  }, []);

  const deleteSeries = useCallback(async (seriesId: string, title?: string) => {
    const ok = confirm(
      `Fresh start delete?\n\nThis will delete:\n- Series\n- Books\n- Chapters\n- Translations\n\n${
        title ? `"${title}"\n\n` : ""
      }This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(seriesId);
    setError(null);

    try {
      const { error } = await supabase.rpc("delete_series_cascade", {
        p_series_id: seriesId,
      });

      if (error) {
        setError(
          `Delete failed: ${error.message}${
            (error as any)?.hint ? ` — ${(error as any).hint}` : ""
          }`
        );
        setDeletingId(null);
        return;
      }

      // Fast UI update
      setSeriesList((prev) => prev.filter((s) => s.id !== seriesId));
      setDeletingId(null);
    } catch (e: any) {
      setError(e?.message || "Unknown error while deleting series.");
      setDeletingId(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await loadSeries();
    })();

    return () => {
      alive = false;
    };
  }, [locale, loadSeries]);

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Studio</h1>
            <p className="text-sm text-slate-400">
              Manage your series, chapters, covers, and languages.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadSeries}
              className="rounded border border-slate-700 bg-black/40 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              type="button"
            >
              Retry
            </button>

            <Link
              href={`/${locale}/studio/series/new`}
              className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
            >
              + Create new series
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
            <div className="font-semibold mb-1">Error</div>
            <div className="text-xs opacity-90">{error}</div>
            <div className="mt-2 text-xs text-rose-300">
              If this says “permission denied” → it’s **RLS policy / not logged in**.
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : seriesList.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-sm text-slate-300">No series yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Click “Create new series” to start.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seriesList.map((s) => (
              <Link
                key={s.id}
                href={`/${locale}/studio/series/${s.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 hover:border-slate-600 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold line-clamp-1">{s.title}</h2>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {s.language || locale}
                  </span>
                </div>

                {s.description && (
                  <p className="mt-2 text-xs text-slate-300 line-clamp-2">
                    {s.description}
                  </p>
                )}

                <p className="mt-3 text-[11px] text-slate-500">
                  {new Date(s.created_at).toLocaleString()}
                </p>

                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault(); // stop link navigation
                      e.stopPropagation();
                      if (deletingId) return;
                      deleteSeries(s.id, s.title);
                    }}
                    className="text-xs text-rose-300 hover:text-rose-200 border border-rose-900/60 hover:border-rose-700 rounded px-3 py-1"
                    disabled={!!deletingId}
                    aria-disabled={!!deletingId}
                    title="Delete series (cascade)"
                  >
                    {deletingId === s.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}