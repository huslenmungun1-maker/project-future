"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function PublisherPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="space-y-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Publisher • Project Future
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Creator studio
          </h1>
          <p className="max-w-xl text-sm text-slate-300">
            This is where creators manage their work: series, chapters, images,
            and AI tools. For now it&apos;s a simple placeholder page while we
            wire Supabase + UI.
          </p>

          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-black/40 px-4 py-2 text-xs font-medium text-slate-200 hover:border-amber-400 hover:text-amber-200"
          >
            ← Back to main studio
          </Link>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-sm font-semibold text-slate-100">
            What this page will do later
          </h2>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
            <li>Create new series (title, genres, language, tags).</li>
            <li>Upload chapter images or pages.</li>
            <li>Use AI assistant to help with story &amp; panel ideas.</li>
            <li>Manage visibility (draft / public / private).</li>
          </ul>
          <p className="text-xs text-slate-400">
            Next steps: connect this to Supabase (series &amp; chapters tables)
            and require login.
          </p>
        </section>
      </div>
    </main>
  );
}
