"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SupabaseTest() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function run() {
      const { data, error } = await supabase
        .from("series")
        .select("id, title")
        .limit(5);

      setResult({ data, error });
    }
    run();
  }, []);

  return (
    <pre className="p-6 text-xs">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
