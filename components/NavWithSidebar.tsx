"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/supabase-js";

type SupportedLocale = "en" | "ko" | "mn" | "ja";
type UserRole = "reader" | "creator" | "owner";

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || "";
const LOCALES: SupportedLocale[] = ["en", "ko", "mn", "ja"];
const SIDEBAR_W = 260;

function normalizeLocale(raw: string): SupportedLocale {
  return (LOCALES.includes(raw as SupportedLocale) ? raw : "en") as SupportedLocale;
}

function stripLeadingLocale(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return "/";
  if (LOCALES.includes(parts[0] as SupportedLocale)) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

const UI_TEXT = {
  en: { home: "Home", reader: "Reader", studio: "Studio", creator: "Become a Creator", profile: "Profile", head: "Admin", signout: "Sign Out", signin: "Sign In", language: "Language" },
  ko: { home: "홈", reader: "리더", studio: "스튜디오", creator: "크리에이터 되기", profile: "프로필", head: "관리자", signout: "로그아웃", signin: "로그인", language: "언어" },
  mn: { home: "Нүүр", reader: "Уншигч", studio: "Студи", creator: "Бүтээгч болох", profile: "Профайл", head: "Админ", signout: "Гарах", signin: "Нэвтрэх", language: "Хэл" },
  ja: { home: "ホーム", reader: "リーダー", studio: "スタジオ", creator: "クリエイターになる", profile: "プロフィール", head: "管理者", signout: "ログアウト", signin: "ログイン", language: "言語" },
} as const;

export default function NavWithSidebar({ locale }: { locale: string }) {
  // hovered: controlled purely by mouse enter/leave on the sidebar panel
  // locked: toggled by clicking the hamburger, stays open until click outside
  const [hovered, setHovered] = useState(false);
  const [locked, setLocked] = useState(false);
  const open = hovered || locked;

  const sidebarRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const pathname = usePathname() || "/";
  const router = useRouter();
  const l = normalizeLocale(locale);
  const t = UI_TEXT[l];
  const restPath = stripLeadingLocale(pathname);

  const supabase = useMemo(() => createClientComponentClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("reader");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user) fetchRole(data.session.user.id, data.session.user.email ?? "");
    }

    async function fetchRole(userId: string, email: string) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.role) setRole(profile.role as UserRole);
        else if (OWNER_EMAIL && email === OWNER_EMAIL) setRole("owner");
      } catch {
        if (OWNER_EMAIL && email === OWNER_EMAIL) setRole("owner");
      }
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s?.user) fetchRole(s.user.id, s.user.email ?? "");
      else setRole("reader");
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Close locked sidebar when clicking anywhere outside sidebar + hamburger
  useEffect(() => {
    if (!locked) return;
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      const inSidebar = sidebarRef.current?.contains(target);
      const inHamburger = hamburgerRef.current?.contains(target);
      if (!inSidebar && !inHamburger) setLocked(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [locked]);

  const isOwner =
    role === "owner" ||
    (!!session && !!OWNER_EMAIL && session.user.email === OWNER_EMAIL);
  const isCreator = role === "creator" || isOwner;

  const mkHref = (next: SupportedLocale) =>
    restPath === "/" ? `/${next}` : `/${next}${restPath}`;

  async function handleSignOut() {
    await supabase.auth.signOut();
    setRole("reader");
    setLocked(false);
    setHovered(false);
    router.replace(`/${l}/login`);
    router.refresh();
  }

  const navLinks = [
    { href: `/${l}`, label: t.home },
    { href: `/${l}/reader`, label: t.reader },
    ...(isCreator ? [{ href: `/${l}/studio`, label: t.studio }] : []),
    ...(!isCreator ? [{ href: `/${l}/creator/apply`, label: t.creator }] : []),
    ...(session ? [{ href: `/${l}/profile`, label: t.profile }] : []),
    ...(isOwner ? [{ href: `/${l}/head`, label: t.head }] : []),
  ];

  return (
    <>
      {/* ── Hamburger — fixed to left wall, vertically centered in navbar ── */}
      <button
        ref={hamburgerRef}
        onMouseEnter={() => setHovered(true)}
        onClick={() => setLocked((v) => !v)}
        aria-label="Toggle navigation"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "64px",
          width: "56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          zIndex: 201,
          opacity: open ? 0 : 1,
          pointerEvents: open ? "none" : "auto",
          transition: "opacity 0.2s ease",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: "20px",
              height: "1px",
              background: "#3a3a3a",
              borderRadius: "1px",
              flexShrink: 0,
            }}
          />
        ))}
      </button>

      {/* ── Navbar ── */}
      <header
        className="w-full bg-white border-b border-stone-200"
        style={{ position: "relative", zIndex: 10 }}
      >
        <div className="mx-auto w-full max-w-5xl pl-16 pr-6">
          <nav className="flex h-16 items-center justify-between">

            {/* LEFT: logo → nav links */}
            <div className="flex items-center gap-5">

              {/* Logo */}
              <Link
                href={`/${l}`}
                className="flex items-center gap-2 font-semibold tracking-tight text-stone-900 hover:opacity-80"
              >
                <img src="/logo.png" alt="Enkhverse" className="h-8 w-auto object-contain" />
                <span className="text-base text-stone-900">Enkhverse</span>
              </Link>

              {/* Nav links */}
              <div className="hidden sm:flex items-center gap-5 text-sm">
                <Link href={`/${l}/reader`} className="text-stone-600 transition hover:text-stone-900">
                  {t.reader}
                </Link>
                {isCreator && (
                  <Link href={`/${l}/studio`} className="text-stone-600 transition hover:text-stone-900">
                    {t.studio}
                  </Link>
                )}
                {isOwner && (
                  <Link href={`/${l}/head`} className="text-stone-600 transition hover:text-stone-900">
                    {t.head}
                  </Link>
                )}
              </div>
            </div>

            {/* RIGHT: profile when logged in, sign in when logged out */}
            {session ? (
              <Link
                href={`/${l}/profile`}
                className="rounded-full border border-stone-300 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
              >
                {t.profile}
              </Link>
            ) : (
              <Link
                href={`/${l}/login`}
                className="rounded-full border border-stone-900 bg-stone-900 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-stone-700"
              >
                {t.signin}
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ── Sidebar overlay ── */}
      {/* Invisible full-screen closer when locked, sits under the sidebar */}
      {locked && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setLocked(false)}
        />
      )}

      <div
        ref={sidebarRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          width: `${SIDEBAR_W}px`,
          transform: open ? "translateX(0)" : `translateX(-${SIDEBAR_W}px)`,
          transition: "transform 0.38s cubic-bezier(0.32, 0, 0.15, 1), box-shadow 0.38s ease",
          zIndex: 200,
          background: "rgba(250,249,246,0.98)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(0,0,0,0.07)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.13)" : "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "28px 18px 24px",
            overflowY: "auto",
            opacity: open ? 1 : 0,
            transition: "opacity 0.18s ease",
            transitionDelay: open ? "0.12s" : "0s",
          }}
        >
          {/* Brand */}
          <Link
            href={`/${l}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "24px",
              textDecoration: "none",
            }}
            onClick={() => setLocked(false)}
          >
            <img src="/logo.png" alt="Enkhverse" style={{ height: 28, width: "auto" }} />
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text)", letterSpacing: "-0.01em" }}>
              Enkhverse
            </span>
          </Link>

          {/* Nav links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "block",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--text)",
                  textDecoration: "none",
                  transition: "background 0.15s ease",
                }}
                onClick={() => setLocked(false)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Language switcher */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginBottom: "12px" }}>
            <p style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--muted)",
              marginBottom: "10px",
              paddingLeft: "4px",
            }}>
              {t.language}
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {LOCALES.map((loc) => (
                <Link
                  key={loc}
                  href={mkHref(loc)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    textDecoration: "none",
                    border: `1px solid ${loc === l ? "var(--accent)" : "var(--border)"}`,
                    background: loc === l ? "var(--accent)" : "transparent",
                    color: loc === l ? "#fff" : "var(--muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {loc}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth — sign out only here */}
          {session ? (
            <button
              onClick={handleSignOut}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--muted)",
                background: "transparent",
                border: "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {t.signout}
            </button>
          ) : (
            <Link
              href={`/${l}/login`}
              style={{
                display: "block",
                padding: "9px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                color: "#fff",
                background: "var(--accent)",
                textAlign: "center",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.82")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {t.signin}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
