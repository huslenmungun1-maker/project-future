"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DebugResult = {
  data: any;
  error: any;
};

export default function SupabaseDebugPage() {
  const [result, setResult] = useState<DebugResult | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from("series") // or your table
        .select("*")
        .limit(5);

      setResult({ data, error });
    };

    run();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase Debug</h1>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </main>
  );
}
