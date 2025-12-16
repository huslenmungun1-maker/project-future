import type { ReactNode } from "react";

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
      {children}
    </div>
  );
}
