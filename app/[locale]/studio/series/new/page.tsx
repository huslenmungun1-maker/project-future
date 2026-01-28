"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type InsertedSeries = { id: string };

export default function NewSeriesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function create() {
      setError(null);

      const { data, error } = await supabase
        .from("series")
        .insert({
          title: "Untitled series",
          description: null,
          language: locale, // default language = current locale
          cover_image_url: null,
        })
        .select("id")
        .single();

      if (error) {
        setError(error.message);
        return;
      }

      const created = data as InsertedSeries | null;
      if (!created?.id) {
        setError("Created series but no id returned.");
        return;
      }

      router.replace(`/${locale}/studio/series/${created.id}`);
    }

    create();
  }, [router, locale]);

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-xl font-semibold">Creating series…</h1>

        {!error ? (
          <p className="mt-2 text-sm text-slate-400">Please wait.</p>
        ) : (
          <div className="mt-4 rounded border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
            Failed: {error}
          </div>
        )}
      </div>
    </main>
  );
}
