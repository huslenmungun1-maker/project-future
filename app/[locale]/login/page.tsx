"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || "";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const locale = (params?.locale as string) || "en";
  const explicitRedirect = search.get("redirect");

  const supabase = useMemo(() => createClientComponentClient(), []);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword("");
    setConfirmPassword("");
  }

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

      const isOwner = OWNER_EMAIL && data.session.user.email === OWNER_EMAIL;
      const destination =
        explicitRedirect ||
        (isOwner ? `/${locale}/studio` : `/${locale}/profile`);

      setLoading(false);
      router.replace(destination);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(typeof err?.message === "string" ? err.message : "Login failed.");
      setLoading(false);
    }
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccessMsg("Account created! Check your email to confirm your address, then log in.");
    } catch (err: any) {
      setErrorMsg(typeof err?.message === "string" ? err.message : "Sign up failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-sm px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {mode === "login" ? "Login" : "Sign Up"}
          </h1>
          <Link
            href={`/${locale}`}
            className="text-xs text-emerald-300 hover:text-emerald-200"
          >
            ← Back to main
          </Link>
        </div>

        {/* Mode tabs */}
        <div className="mb-6 flex rounded-md border border-slate-700 p-0.5">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-emerald-500 text-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-emerald-500 text-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {successMsg ? (
          <div className="rounded-md border border-emerald-700 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
            {successMsg}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="mt-3 block w-full rounded-md bg-emerald-500 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form
            onSubmit={mode === "login" ? handleLogin : handleSignup}
            className="space-y-4"
          >
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

            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Confirm Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-700 bg-black/40 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {errorMsg && <p className="text-xs text-rose-300">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-emerald-500 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-70"
            >
              {loading
                ? mode === "login"
                  ? "Logging in…"
                  : "Creating account…"
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>

            {mode === "login" && explicitRedirect && (
              <p className="text-[11px] text-slate-500">
                After login → <span className="text-slate-300">{explicitRedirect}</span>
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}