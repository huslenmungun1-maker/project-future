import NavWithSidebar from "@/components/NavWithSidebar";

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
      <NavWithSidebar locale={locale} />
      {children}
    </div>
  );
}
