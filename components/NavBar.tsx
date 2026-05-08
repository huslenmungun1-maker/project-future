"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

type SupportedLocale = "en" | "ko" | "mn" | "ja";
type UserRole = "reader" | "creator" | "owner";

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

function stripLeadingLocale(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  const first = parts[0];
  if (["en", "ko", "mn", "ja"].includes(first)) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}


const UI_TEXT = {
  en:  { reader: "Reader", studio: "Studio", head: "Admin", profile: "Profile", wallet: "Wallet", login: "Login", signout: "Sign Out" },
  ko:  { reader: "리더", studio: "스튜디오", head: "관리자", profile: "프로필", wallet: "지갑", login: "로그인", signout: "로그아웃" },
  mn:  { reader: "Уншигч", studio: "Студи", head: "Админ", profile: "Профайл", wallet: "Хэтэвч", login: "Нэвтрэх", signout: "Гарах" },
  ja:  { reader: "リーダー", studio: "スタジオ", head: "管理者", profile: "プロフィール", wallet: "ウォレット", login: "ログイン", signout: "ログアウト" },
} as const;

export default function NavBar({ locale }: { locale: string }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const currentLocale = normalizeLocale(locale);
  const t = UI_TEXT[currentLocale];
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("reader");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user) {
        await fetchRole(data.session.user.id);
      }
    }

    async function fetchRole(userId: string) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.role) {
          setRole(profile.role as UserRole);
        }
      } catch {
        // profiles unavailable, stay as reader
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await fetchRole(s.user.id);
      } else {
        setRole("reader");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const isOwner = role === "owner";
  const isCreator = role === "creator" || isOwner;

  async function handleSignOut() {
    await supabase.auth.signOut();
    setRole("reader");
    router.replace(`/${currentLocale}/login`);
    router.refresh();
  }

  return (
    <nav className="flex h-16 items-center justify-between">
      <div className="flex items-center gap-8">
        <Link
          href={`/${currentLocale}`}
          className="flex items-center gap-3 font-semibold tracking-tight text-stone-900 hover:opacity-80"
        >
          <img
            src="/logo.png"
            alt="Enkhverse"
            className="h-18 w-auto object-contain mr-2"
          />
          <span className="text-base text-stone-900">Enkhverse</span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link
            href={`/${currentLocale}/reader`}
            className="text-stone-700 transition hover:text-stone-950"
          >
            {t.reader}
          </Link>

          {isCreator && (
            <Link
              href={`/${currentLocale}/studio`}
              className="text-stone-700 transition hover:text-stone-950"
            >
              {t.studio}
            </Link>
          )}

          {isOwner && (
            <Link
              href={`/${currentLocale}/head`}
              className="text-stone-700 transition hover:text-stone-950"
            >
              {t.head}
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Auth */}
        {session ? (
          <div className="ml-2 flex items-center gap-2">
            <Link
              href={`/${currentLocale}/wallet`}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
            >
              {t.wallet}
            </Link>
            <Link
              href={`/${currentLocale}/profile`}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
            >
              {t.profile}
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
            >
              {t.signout}
            </button>
          </div>
        ) : (
          <Link
            href={`/${currentLocale}/login`}
            className="ml-2 rounded-full border border-stone-900 bg-stone-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-stone-700"
          >
            {t.login}
          </Link>
        )}
      </div>
    </nav>
  );
}
