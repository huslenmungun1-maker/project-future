import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import SignOutButton from "@/components/SignOutButton";

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || "";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const email = session.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();
  const isOwner = OWNER_EMAIL && email === OWNER_EMAIL;
  const joinedAt = new Date(session.user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <Link
            href={`/${locale}`}
            className="text-sm text-emerald-300 hover:text-emerald-200"
          >
            ← Back to main
          </Link>
        </div>

        {/* Avatar + identity */}
        <div className="mb-8 flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-base font-medium">{email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isOwner
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {isOwner ? "Owner" : "Reader"}
              </span>
              <span className="text-xs text-slate-500">Joined {joinedAt}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isOwner && (
            <Link
              href={`/${locale}/studio`}
              className="flex items-center justify-between rounded-lg border border-slate-700 px-4 py-3 text-sm transition hover:border-emerald-600 hover:bg-emerald-950/30"
            >
              <span>Studio</span>
              <span className="text-slate-400">→</span>
            </Link>
          )}

          {!isOwner && (
            <Link
              href={`/${locale}/creator/apply`}
              className="flex items-center justify-between rounded-lg border border-slate-700 px-4 py-3 text-sm transition hover:border-emerald-600 hover:bg-emerald-950/30"
            >
              <span>Apply to become a creator</span>
              <span className="text-slate-400">→</span>
            </Link>
          )}

          <Link
            href={`/${locale}/reader`}
            className="flex items-center justify-between rounded-lg border border-slate-700 px-4 py-3 text-sm transition hover:border-slate-500"
          >
            <span>Browse reader</span>
            <span className="text-slate-400">→</span>
          </Link>
        </div>

        <div className="mt-10">
          <SignOutButton locale={locale} />
        </div>
      </main>
    </div>
  );
}
