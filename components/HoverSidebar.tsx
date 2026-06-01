"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

type SupportedLocale = "en" | "ko" | "mn" | "ja";
type UserRole = "reader" | "creator" | "owner";

const LOCALES: SupportedLocale[] = ["en", "ko", "mn", "ja"];
const WIDTH = 260;
const PEEK = 44;

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
  en: { home: "Home", reader: "Reader", studio: "Studio", creator: "Become a Creator", profile: "Profile", head: "Admin", signout: "Sign Out", login: "Login", language: "Language" },
  ko: { home: "홈", reader: "리더", studio: "스튜디오", creator: "크리에이터 되기", profile: "프로필", head: "관리자", signout: "로그아웃", login: "로그인", language: "언어" },
  mn: { home: "Нүүр", reader: "Уншигч", studio: "Студи", creator: "Бүтээгч болох", profile: "Профайл", head: "Админ", signout: "Гарах", login: "Нэвтрэх", language: "Хэл" },
  ja: { home: "ホーム", reader: "リーダー", studio: "スタジオ", creator: "クリエイターになる", profile: "プロフィール", head: "管理者", signout: "ログアウト", login: "ログイン", language: "言語" },
} as const;

export default function HoverSidebar({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "/";
  const router = useRouter();
  const l = normalizeLocale(locale);
  const t = UI_TEXT[l];
  const restPath = stripLeadingLocale(pathname);

  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("reader");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user) fetchRole(data.session.user.id);
    }

    async function fetchRole(userId: string) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile?.role) setRole(profile.role as UserRole);
      } catch {
        // profiles unavailable, stay as reader
      }
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s?.user) fetchRole(s.user.id);
      else setRole("reader");
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const isOwner = role === "owner";
  const isCreator = role === "creator" || isOwner;

  const mkHref = (next: SupportedLocale) =>
    restPath === "/" ? `/${next}` : `/${next}${restPath}`;

  async function handleSignOut() {
    await supabase.auth.signOut();
    setRole("reader");
    router.replace(`/${l}/login`);
    router.refresh();
  }

  const navLinks = [
    { href: `/${l}`, label: t.home },
    { href: `/${l}/reader`, label: t.reader },
    ...(isCreator ? [{ href: `/${l}/studio`, label: t.studio }] : []),
    ...(isOwner ? [{ href: `/${l}/head`, label: t.head }] : []),
  ];

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: `${WIDTH}px`,
        transform: open ? "translateX(0)" : `translateX(${PEEK - WIDTH}px)`,
        transition: "transform 0.38s cubic-bezier(0.32, 0, 0.15, 1), box-shadow 0.38s ease",
        zIndex: 100,
        background: "rgba(250,249,246,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(0,0,0,0.07)",
        boxShadow: open ? "8px 0 40px rgba(0,0,0,0.12)" : "2px 0 6px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Hamburger lines — visible on the right edge strip when closed */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: `${PEEK}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "5px",
          padding: "14px 0",
          opacity: open ? 0 : 1,
          transition: "opacity 0.15s ease",
          pointerEvents: "none",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: "18px",
              height: "1.5px",
              background: "#666",
              borderRadius: "2px",
            }}
          />
        ))}
      </div>

      {/* Main content — fades in after panel slides out */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "28px 18px 24px",
          overflowY: "auto",
          opacity: open ? 1 : 0,
          transition: "opacity 0.16s ease",
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
        >
          <img src="/logo.png" alt="Enkhverse" style={{ height: 28, width: "auto" }} />
          <span
            style={{
              fontWeight: 700,
              fontSize: "15px",
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
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
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(0,0,0,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Language switcher */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "16px",
            marginBottom: "12px",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--muted)",
              marginBottom: "10px",
              paddingLeft: "4px",
            }}
          >
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

        {/* Auth */}
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0.04)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
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
            {t.login}
          </Link>
        )}
      </div>
    </div>
  );
}
