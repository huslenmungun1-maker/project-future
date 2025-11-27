import Link from "next/link";

type Props = {
  params: { locale: string };
};

export default function ProfilePage({ params }: Props) {
  const { locale } = params;

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <Link
            href={`/${locale}`}
            className="text-sm text-emerald-300 hover:text-emerald-200"
          >
            ← Back to main
          </Link>
        </div>

        <p className="text-sm text-slate-300">
          This will later show your account info, role (reader / creator / owner),
          avatar, and language settings.
        </p>
      </main>
    </div>
  );
}
