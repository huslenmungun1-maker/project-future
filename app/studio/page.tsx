"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const OWNER_EMAIL = "huslen.mungun1@gmail.com";

export default function StudioHome() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        router.replace("/");
        return;
      }

      if (user.email?.toLowerCase() !== OWNER_EMAIL) {
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