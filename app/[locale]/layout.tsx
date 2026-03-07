import NavBar from "@/components/NavBar";

type Params = { locale: string };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params | Promise<Params>;
}) {
  const { locale } = await Promise.resolve(params);

  return (
    <div className="min-h-screen theme-soft">
      <header className="w-full bg-white border-b border-stone-200">
        <div className="mx-auto w-full max-w-5xl px-6">
          <NavBar locale={locale} />
        </div>
      </header>

      {children}
    </div>
  );
}