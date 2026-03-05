"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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

  // ✅ cookie-aware client (fixes "Not authenticated")
  const supabase = useMemo(() => createClientComponentClient(), []);

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
  }, [supabase]);

  const deleteSeries = useCallback(
    async (seriesId: string, title?: string) => {
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

        setSeriesList((prev) => prev.filter((s) => s.id !== seriesId));
        setDeletingId(null);
      } catch (e: any) {
        setError(e?.message || "Unknown error while deleting series.");
        setDeletingId(null);
      }
    },
    [supabase]
  );

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
    <main className="min-h-screen theme-soft">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
            <p className="text-sm text-[color:var(--muted)]">
              Manage your series, chapters, covers, and languages.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={loadSeries} className="btn-ios-secondary text-sm" type="button">
              Retry
            </button>

            <Link href={`/${locale}/studio/series/new`} className="btn-ios text-sm font-semibold">
              + Create new series
            </Link>
          </div>
        </div>

        {error && (
          <div className="soft-card p-4">
            <div className="font-semibold mb-1 text-[color:var(--text)]">Error</div>
            <div className="text-xs text-[color:var(--muted)]">{error}</div>
            <div className="mt-2 text-xs text-[color:var(--muted)]">
              If this says “permission denied” → it’s <b>RLS policy / not logged in</b>.
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[color:var(--muted)]">Loading…</p>
        ) : seriesList.length === 0 ? (
          <div className="soft-card p-6">
            <p className="text-sm text-[color:var(--text)]">No series yet.</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Click “Create new series” to start.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seriesList.map((s) => (
              <Link
                key={s.id}
                href={`/${locale}/studio/series/${s.id}`}
                className="soft-card p-5 hover:opacity-95 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold line-clamp-1 text-[color:var(--text)]">
                    {s.title}
                  </h2>
                  <span className="text-[11px] text-[color:var(--muted)] shrink-0">
                    {s.language || locale}
                  </span>
                </div>

                {s.description && (
                  <p className="mt-2 text-xs text-[color:var(--muted)] line-clamp-2">
                    {s.description}
                  </p>
                )}

                <p className="mt-3 text-[11px] text-[color:var(--muted)]">
                  {new Date(s.created_at).toLocaleString()}
                </p>

                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (deletingId) return;
                      deleteSeries(s.id, s.title);
                    }}
                    className="btn-ios-danger text-xs"
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