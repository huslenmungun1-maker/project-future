// app/[locale]/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

type LocaleParams = {
  locale: string;
};

type LocaleLayoutProps = {
  children: ReactNode;
  // In Next 16, params is typed as a Promise in the route config
  params: Promise<LocaleParams>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  // Wait for the params promise to resolve
  const { locale } = await params;

  const navLinks = [
    { href: `/${locale}`, label: "Home" },
    { href: `/${locale}/reader`, label: "Reader`" },
    { href: `/${locale}/publisher`, label: "Publisher" },
    { href: `/${locale}/head`, label: "Head Page" },
  ];

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="text-lg font-semibold tracking-tight">
              <span className="text-fuchsia-400">Project</span>{" "}
              <span className="text-sky-400">Future</span>
            </div>
            <nav className="flex gap-4 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1 transition hover:bg-slate-800"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
