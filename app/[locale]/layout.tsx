import type { ReactNode } from "react";

type LocaleParams = { locale: string };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: LocaleParams | Promise<LocaleParams>;
}) {
  const { locale } = await Promise.resolve(params);

  return (
    <div className="min-h-screen bg-black text-white" data-locale={locale}>
      {children}
    </div>
  );
}
