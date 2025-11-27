"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo("Trying to log in...");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase login error:", error);
      setError("Login error: " + error.message);
      setInfo(null);
      setLoading(false);
      return;
    }

    if (!data || !data.user) {
      console.error("Supabase login: no user in response:", data);
      setError("Login succeeded but no user was returned.");
      setInfo(null);
      setLoading(false);
      return;
    }

    // ✅ SUCCESS
    setInfo("Logged in! Redirecting...");
    setLoading(false);

    // 👉 change this path if your main page is different
    router.push("/en");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-6">
        <h1 className="text-2xl font-semibold text-white text-center">
          Login to AI Manga Studio
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="••••••••"
              required
            />
          </div>

          {info && (
            <p className="text-sm text-indigo-300">
              {info}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-400 transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
