"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const locale = (params?.locale as string) || "en";
  const redirectTo = search.get("redirect") || `/${locale}/studio`;

  const supabase = createClientComponentClient(); // ✅ cookie-based session for middleware

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (!data?.session) {
        setErrorMsg("Login succeeded but no session returned.");
        setLoading(false);
        return;
      }

      setLoading(false);

      // ✅ replace + refresh so middleware sees cookies immediately
      router.replace(redirectTo);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(typeof err?.message === "string" ? err.message : "Login failed.");
      setLoading(false);
    }
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
              required
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-300">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-70"
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          <p className="text-[11px] text-slate-500">
            After login → <span className="text-slate-300">{redirectTo}</span>
          </p>
        </form>
      </main>
    </div>
  );
}
