// app/[locale]/page.tsx
import Link from "next/link";

export default function LocaleHomePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-2 text-3xl font-bold">
          Welcome to <span className="text-fuchsia-400">Project Future</span>
        </h1>
        <p className="max-w-2xl text-slate-300">
          Read, create, and manage manga / comics in one place. This is the
          early build – functional first, pretty and advanced later.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {/* Reader card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div>
            <h2 className="mb-1 text-xl font-semibold">Reader</h2>
            <p className="text-sm text-slate-300">
              Browse public series and start reading. No login required (for
              now).
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
            <h2 className="mb-1 text-xl font-semibold">Publisher Studio</h2>
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
    </div>
  );
}
