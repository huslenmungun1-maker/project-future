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
      <main className="mx-auto w-full max-w-5xl px-6 py-12 md:px-8 md:py-16">
        {/* Hero */}
        <section className="mb-10 space-y-4">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-stone-700"
            style={{
              borderColor: "rgba(47,47,47,0.12)",
              background: "rgba(233,230,223,0.72)",
            }}
          >
            Enkhverse · Soft Editorial Build
          </div>

          <div className="space-y-3">
          <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight md:text-4xl">
  Don’t hide your creativity. Let the world see it.
</h1>

            <p
              className="max-w-3xl text-base leading-7"
              style={{ color: "var(--muted)" }}
            >
              Read, create, and manage manga / comics in one place. This is the
              early build — functional first, elegant later.
            </p>
          </div>
        </section>

        {/* Main cards */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="soft-card flex min-h-[240px] flex-col justify-between p-6">
            <div className="space-y-3">
              <div
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "rgba(233,230,223,0.9)",
                  border: "1px solid rgba(47,47,47,0.12)",
                }}
              >
                Read
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Reader</h2>
                <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Browse public series and start reading. No login required for
                  now.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/${locale}/reader`}
                className="btn-ios-secondary w-full"
              >
                Go to Reader
              </Link>
            </div>
          </div>

          <div className="soft-card flex min-h-[240px] flex-col justify-between p-6">
            <div className="space-y-3">
              <div
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{
                  background: "var(--accent)",
                  border: "1px solid rgba(47,47,47,0.08)",
                }}
              >
                Create
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Publisher Studio
                </h2>
                <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Create series, upload chapters, and manage your projects in one
                  place.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/${locale}/publisher`}
                className="btn-ios w-full"
              >
                Go to Publisher
              </Link>
            </div>
          </div>

          <div className="soft-card flex min-h-[240px] flex-col justify-between p-6">
            <div className="space-y-3">
              <div
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "rgba(233,230,223,0.9)",
                  border: "1px solid rgba(47,47,47,0.12)",
                }}
              >
                Owner
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Head Page</h2>
                <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Owner-only dashboard for stats, revenue, and system controls.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/${locale}/head`}
                className="btn-ios-secondary w-full"
              >
                Go to Head Page
              </Link>
            </div>
          </div>
        </section>

        {/* Extra links */}
        <section className="soft-card mt-8 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold tracking-tight">
              More (future pages)
            </h3>

            <div
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "rgba(233,230,223,0.9)",
                border: "1px solid rgba(47,47,47,0.12)",
              }}
            >
              Early navigation
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { href: `/${locale}/profile`, label: "Profile" },
              { href: `/${locale}/chat`, label: "Chat (Core Assistant)" },
              { href: `/${locale}/ai`, label: "AI Tools" },
              { href: `/${locale}/payments`, label: "Payments" },
              { href: `/${locale}/login`, label: "Login (for owner / creators)" },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="rounded-2xl border px-4 py-3 text-sm transition hover:opacity-90"
                style={{
                  borderColor: "rgba(47,47,47,0.12)",
                  background: "rgba(255,255,255,0.28)",
                  color: "var(--text)",
                }}
              >
                {x.label}
              </Link>
            ))}
          </div>

          <p className="mt-4 text-[11px]" style={{ color: "var(--muted)" }}>
            If some links give 404 now, that&apos;s fine. We&apos;ll build them one
            by one.
          </p>
        </section>
      </main>
    </div>
  );
}