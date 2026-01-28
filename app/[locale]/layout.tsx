import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";

type Params = { locale: string };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params | Promise<Params>;
}) {
  const { locale } = await Promise.resolve(params);

  return (
    <div className="min-h-screen bg-black text-white" data-locale={locale}>
      <div className="mx-auto max-w-6xl px-6 py-4">
        <NavBar locale={locale} />
      </div>

      {children}
    </div>
  );
}
