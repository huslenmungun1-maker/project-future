"use client";

export default function EnvDebug() {
  return (
    <pre className="p-6 text-sm">
      {JSON.stringify(
        {
          SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + "...",
        },
        null,
        2
      )}
    </pre>
  );
}
