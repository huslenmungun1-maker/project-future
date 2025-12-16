import type { ReactNode } from "react";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Root app/layout.tsx already has <html> and <body>, so keep this as a wrapper only
  return (
    <div className="min-h-screen bg-black text-white" data-locale={locale}>
      {children}
    </div>
  );
}
