"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/browserClient";

export default function StudioHome() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const supabase = getBrowserClient();

    async function check() {
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
        .eq("user_id", user.id)
        .maybeSingle();

      const role = profile?.role ?? "reader";
      if (role !== "creator" && role !== "owner") {
        router.replace("/");
        return;
      }

      setAllowed(true);
    }

    check();
  }, [router]);

  if (!allowed) {
    return (
      <main style={{ padding: 40 }}>
        <p>Checking access…</p>
      </main>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Creator Studio</h1>
      <p>Owner access granted.</p>
    </div>
  );
}