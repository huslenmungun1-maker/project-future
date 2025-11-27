"use client";

import Link from "next/link";

type Props = {
  params: { locale: string };
};

export default function LocaleHomePage({ params }: Props) {
  const { locale } = params;

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Title */}
        <section>
          <h1 className="mb-2 text-3xl font-bold">
            Welcome to{" "}
            <span className="text-fuchsia-400">Project Future</span>
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Read, create, and manage manga / comics in one place.
            This is the early build – functional first, pretty and advanced later.
          </p>
        </section>

        {/* Main cards */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Reader card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <h2 className="mb-1 text-xl font-semibold">Reader</h2>
              <p className="text-sm text-slate-300">
                Browse public series and start reading.
                No login required (for now).
              </p>
            </div>
            <Link
              href={`/${locale}/reader`}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-sky-500 px-3 py-1 text-sm font-medium transition hover:bg-sky-500 hover:text-slate-900"
            >
              Go to Reader
            </Link>
          </div>

          {/* Publisher card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <h2 className="mb-1 text-xl font-semibold">
                Publisher Studio
              </h2>
              <p className="text-sm text-slate-300">
                Create series, upload chapters, and manage your projects.
              </p>
            </div>
            <Link
              href={`/${locale}/publisher`}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-emerald-500 px-3 py-1 text-sm font-medium transition hover:bg-emerald-500 hover:text-slate-900"
            >
              Go to Publisher
            </Link>
          </div>

          {/* Head / Owner card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <h2 className="mb-1 text-xl font-semibold">Head Page</h2>
              <p className="text-sm text-slate-300">
                Owner-only dashboard: stats, revenue, system switches.
              </p>
            </div>
            <Link
              href={`/${locale}/head`}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-amber-500 px-3 py-1 text-sm font-medium transition hover:bg-amber-500 hover:text-slate-900"
            >
              Go to Head Page
            </Link>
          </div>
        </section>

        {/* Extra links (optional) */}
        <section className="space-y-2 text-sm text-slate-300">
          <p className="font-semibold">More (future pages):</p>
          <ul className="space-y-1 text-xs">
            <li>
              <Link
                href={`/${locale}/profile`}
                className="text-emerald-300 hover:underline"
              >
                ➤ Profile
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/chat`}
                className="text-emerald-300 hover:underline"
              >
                ➤ Chat (Core Assistant)
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/ai`}
                className="text-emerald-300 hover:underline"
              >
                ➤ AI Tools
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/payments`}
                className="text-emerald-300 hover:underline"
              >
                ➤ Payments
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/login`}
                className="text-slate-300 hover:underline"
              >
                Login (for owner / creators)
              </Link>
            </li>
          </ul>

          <p className="mt-3 text-[11px] text-slate-500">
            If some links give 404 now, it&apos;s okay.
            We&apos;ll create those pages one by one.
          </p>
        </section>
      </main>
    </div>
  );
}
