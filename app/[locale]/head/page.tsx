import Link from "next/link";

type Params = { locale: string };

export default async function HeadPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { locale } = await Promise.resolve(params);

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Head Page</h1>
          <Link
            href={`/${locale}`}
            className="text-xs text-emerald-300 hover:underline"
          >
            ← Back to home
          </Link>
        </div>

        <p className="text-sm text-slate-400">
          Owner-only dashboard. Stats, revenue, system switches (we’ll build this
          step by step).
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-xs text-slate-400">Total series</p>
            <p className="mt-2 text-2xl font-bold">—</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-xs text-slate-400">Total chapters</p>
            <p className="mt-2 text-2xl font-bold">—</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-xs text-slate-400">Revenue</p>
            <p className="mt-2 text-2xl font-bold">—</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-3">
          <h2 className="text-lg font-semibold">System switches (coming)</h2>
          <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
            <li>Maintenance mode</li>
            <li>Freeze publishing</li>
            <li>Feature flags</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
