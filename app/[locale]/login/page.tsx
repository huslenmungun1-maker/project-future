"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .maybeSingle();
      const role = profile?.role ?? "reader";
      const destination =
        explicitRedirect ||
        (role === "creator" || role === "owner" ? `/${locale}/studio` : `/${locale}/profile`);

      setLoading(false);
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Login failed.");
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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Sign up failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--bg)" }}>
      <main className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {mode === "login" ? "Login" : "Sign Up"}
          </h1>
          <Link
            href={`/${locale}`}
            className="text-xs transition hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ← Back
          </Link>
        </div>

        {/* Mode tabs */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "rgba(233,230,223,0.72)", border: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="flex-1 rounded-xl py-1.5 text-sm font-medium transition"
            style={{
              background: mode === "login" ? "white" : "transparent",
              color: mode === "login" ? "var(--text)" : "var(--muted)",
              boxShadow: mode === "login" ? "var(--shadow-soft)" : "none",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="flex-1 rounded-xl py-1.5 text-sm font-medium transition"
            style={{
              background: mode === "signup" ? "white" : "transparent",
              color: mode === "signup" ? "var(--text)" : "var(--muted)",
              boxShadow: mode === "signup" ? "var(--shadow-soft)" : "none",
            }}
          >
            Sign Up
          </button>
        </div>

        {successMsg ? (
          <div className="space-y-5 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
              style={{ background: "rgba(94,99,87,0.12)", border: "1px solid rgba(94,99,87,0.2)" }}
            >
              ✉️
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Check your email</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
              </p>
              <p className="text-xs" style={{ color: "var(--muted)", opacity: 0.7 }}>
                Once confirmed, you will be redirected to a welcome screen automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="btn-ios-secondary w-full text-sm"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div
            className="rounded-[24px] p-6 space-y-4"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <form
              onSubmit={mode === "login" ? handleLogin : handleSignup}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Email</label>
                <input
                  type="email"
                  className="soft-input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Password</label>
                <input
                  type="password"
                  className="soft-input w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Confirm Password</label>
                  <input
                    type="password"
                    className="soft-input w-full"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              {errorMsg && <p className="text-xs" style={{ color: "var(--danger)" }}>{errorMsg}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn-ios w-full text-sm disabled:opacity-60"
              >
                {loading
                  ? mode === "login" ? "Logging in…" : "Creating account…"
                  : mode === "login" ? "Login" : "Create Account"}
              </button>

              {mode === "login" && explicitRedirect && (
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  After login → <span style={{ color: "var(--text)" }}>{explicitRedirect}</span>
                </p>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}