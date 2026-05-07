"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { CoreAssistantPanel } from "./CoreAssistantPanel";

export default function StudioPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    async function checkAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role ?? "reader";
      if (role !== "creator" && role !== "owner") {
        router.replace("/");
        return;
      }

      setAuthorized(true);
    }

    checkAccess();
  }, [router]);

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Checking access…</p>
      </main>
    );
  }

  return (
    <div className="grid grid-cols-[2fr,1fr] gap-4 p-4">
      {/* LEFT SIDE */}
      <div className="border rounded-xl p-4">
        <h1 className="text-lg font-bold mb-2">Studio Dashboard</h1>
        <p className="text-sm text-gray-500">
          Your series, chapters, stats will appear here soon.
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="h-[80vh]">
        <CoreAssistantPanel />
      </div>
    </div>
  );
}