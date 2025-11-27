import Link from "next/link";

type Props = {
  params: { locale: string };
};

export default function AIPage({ params }: Props) {
  const { locale } = params;

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">AI Tools</h1>
          <Link
            href={`/${locale}`}
            className="text-sm text-emerald-300 hover:text-emerald-200"
          >
            ← Back to main
          </Link>
        </div>

        <p className="text-sm text-slate-300">
          Future zone for AI helpers: story ideas, panel prompts, translations,
          character sheets, and more.
        </p>
      </main>
    </div>
  );
}
