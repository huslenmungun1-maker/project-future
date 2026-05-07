"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function SignOutButton({
  locale,
  className,
  style,
}: {
  locale: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={className ?? "rounded-md border border-rose-800 px-4 py-2 text-sm text-rose-300 transition hover:bg-rose-900/30"}
      style={style}
    >
      Sign out
    </button>
  );
}
