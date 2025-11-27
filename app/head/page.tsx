import Link from "next/link";

type Props = {
  params: { locale: string };
};

export default function HeadMasterPage({ params }: Props) {
  const { locale } = params;

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-emerald-300">
            HEAD MASTER PANEL
          </h1>

          <Link
            href={`/${locale}`}
            className="text-sm text-emerald-300 hover:text-emerald-200"
          >
            ← Back to main
          </Link>
        </div>

        <p className="text-slate-300 text-sm mb-6">
          This is your private control page.  
          Only you can use this.  
          Later we can lock it behind an “owner only” auth rule.
        </p>

        <div className="grid gap-4">
          <Link
            href={`/${locale}/publisher`}
            className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-emerald-400 hover:bg-slate-800 transition"
          >
            <h2 className="text-lg font-semibold">Creator Studio</h2>
            <p className="text-xs text-slate-400">
              Manage series, drafts, uploads.
            </p>
          </Link>

          <Link
            href={`/${locale}/payments`}
            className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-emerald-400 hover:bg-slate-800 transition"
          >
            <h2 className="text-lg font-semibold">Payments</h2>
            <p className="text-xs text-slate-400">
              Earnings, balances, revenue share settings.
            </p>
          </Link>

          <Link
            href={`/${locale}/chat`}
            className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-emerald-400 hover:bg-slate-800 transition"
          >
            <h2 className="text-lg font-semibold">AI Core Assistant</h2>
            <p className="text-xs text-slate-400">
              Talk to your studio brain. Manage tasks, story ideas, and more.
            </p>
          </Link>

          <Link
            href={`/${locale}/debug`}
            className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-emerald-400 hover:bg-slate-800 transition"
          >
            <h2 className="text-lg font-semibold">Debug / Internal Tools</h2>
            <p className="text-xs text-slate-400">
              Supabase status, logs, version info.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
