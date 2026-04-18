"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SignOutButton({ locale }: { locale: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md border border-rose-800 px-4 py-2 text-sm text-rose-300 transition hover:bg-rose-900/30"
    >
      Sign Out
    </button>
  );
}
