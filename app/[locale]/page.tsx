// app/[locale]/page.tsx
import Link from "next/link";

type Params = { locale: string };

export default async function LocaleHomePage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { locale } = await Promise.resolve(params);

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Title */}
        <section className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">
            Welcome to{" "}
            <span className="underline decoration-[rgba(94,99,87,0.45)] underline-offset-4">
              Project Future
            </span>
          </h1>
          <p className="max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
            Read, create, and manage manga / comics in one place. This is the
            early build — functional first, pretty and advanced later.
          </p>
        </section>

        {/* Main cards */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Reader card */}
          <div className="soft-card flex flex-col justify-between p-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Reader</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Browse public series and start reading. No login required (for
                now).
              </p>
            </div>

            <div className="mt-5">
              <Link href={`/${locale}/reader`} className="btn-ios-secondary w-full">
                Go to Reader
              </Link>
            </div>
          </div>

          {/* Publisher card */}
          <div className="soft-card flex flex-col justify-between p-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Publisher Studio</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Create series, upload chapters, and manage your projects.
              </p>
            </div>

            <div className="mt-5">
              <Link href={`/${locale}/publisher`} className="btn-ios w-full">
                Go to Publisher
              </Link>
            </div>
          </div>

          {/* Head / Owner card */}
          <div className="soft-card flex flex-col justify-between p-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Head Page</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Owner-only dashboard: stats, revenue, system switches.
              </p>
            </div>

            <div className="mt-5">
              <Link href={`/${locale}/head`} className="btn-ios-secondary w-full">
                Go to Head Page
              </Link>
            </div>
          </div>
        </section>

        {/* Extra links */}
        <section className="soft-card p-5 space-y-3">
          <p className="font-semibold">More (future pages):</p>

          <ul className="space-y-1 text-sm">
            {[
              { href: `/${locale}/profile`, label: "➤ Profile" },
              { href: `/${locale}/chat`, label: "➤ Chat (Core Assistant)" },
              { href: `/${locale}/ai`, label: "➤ AI Tools" },
              { href: `/${locale}/payments`, label: "➤ Payments" },
            ].map((x) => (
              <li key={x.href}>
                <Link
                  href={x.href}
                  className="underline underline-offset-4 decoration-[rgba(47,47,47,0.22)] hover:decoration-[rgba(47,47,47,0.45)]"
                >
                  {x.label}
                </Link>
              </li>
            ))}

            <li className="pt-1">
              <Link
                href={`/${locale}/login`}
                className="underline underline-offset-4 decoration-[rgba(47,47,47,0.22)] hover:decoration-[rgba(47,47,47,0.45)]"
              >
                Login (for owner / creators)
              </Link>
            </li>
          </ul>

          <p className="text-[11px]" style={{ color: "var(--muted)" }}>
            If some links give 404 now, it&apos;s okay. We&apos;ll create those
            pages one by one.
          </p>
        </section>
      </main>
    </div>
  );
}