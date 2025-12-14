import type { ReactNode } from "react";

export default function LocaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Root app/layout.tsx already has <html> and <body>,
  // so here we just wrap the page content.
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  );
}
