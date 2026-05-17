import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function HeadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await Promise.resolve(params);
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "owner") redirect(`/${locale}`);

  return <>{children}</>;
}
