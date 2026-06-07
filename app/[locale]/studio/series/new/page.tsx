"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBrowserClient } from "@/lib/browserClient";

type InsertedSeries = { id: string };

export default function NewSeriesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const supabase = useMemo(() => getBrowserClient(), []);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function create() {
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        if (!cancelled) setError(sessionError.message);
        return;
      }

      const user = session?.user;

      if (!user) {
        router.replace(`/${locale}/login`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = profile?.role ?? "reader";
      if (role !== "creator" && role !== "owner" && user.email !== process.env.NEXT_PUBLIC_OWNER_EMAIL) {
        router.replace(`/${locale}/profile`);
        return;
      }

      const { data, error } = await supabase
        .from("series")
        .insert({
          title: "Untitled series",
          description: null,
          language: locale,
          cover_image_url: null,
          project_type: "manga",
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error) {
        if (!cancelled) setError(error.message);
        return;
      }

      const created = data as InsertedSeries | null;

      if (!created?.id) {
        if (!cancelled) setError("Created series but no id returned.");
        return;
      }

      router.replace(`/${locale}/studio/series/${created.id}`);
    }

    create();

    return () => {
      cancelled = true;
    };
  }, [router, locale, supabase]);

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