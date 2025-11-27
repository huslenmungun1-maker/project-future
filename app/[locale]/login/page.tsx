"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Login error: " + error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login success but Supabase returned no user.");
      setLoading(false);
      return;
    }

    // ✅ On success, go straight to HEAD MASTER page
    router.push(`/${locale}/head`);
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-sm px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Login</h1>
          <Link
            href={`/${locale}`}
            className="text-xs text-emerald-300 hover:text-emerald-200"
          >
            ← Back to main
          </Link>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-70"
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </main>
    </div>
  );
}
