import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "mn", "ko", "ja"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

// Fallback email check while transitioning to role-based system
const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || "";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore Next internals + files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ---- Locale handling ----
  const parts = pathname.split("/");
  const first = parts[1];

  if (!isLocale(first)) {
    const url = req.nextUrl.clone();
    url.pathname = `/en${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  const restPath = "/" + parts.slice(2).join("/");

  // ---- Public pages ----
  if (
    restPath === "/" ||
    restPath.startsWith("/reader") ||
    restPath.startsWith("/login") ||
    restPath.startsWith("/auth") ||
    restPath.startsWith("/welcome")
  ) {
    return NextResponse.next();
  }

  // ---- Auth check ----
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const userEmail = session.user.email || "";

  // ---- Role check ----
  // Primary: query profiles table. Fallback: owner email env var.
  let isOwner = false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.role === "owner") {
      isOwner = true;
    } else if (!profile && OWNER_EMAIL && userEmail === OWNER_EMAIL) {
      // Profiles table exists but no row yet — use email fallback
      isOwner = true;
    }
  } catch {
    // Profiles table may not exist yet — fall back to email
    if (OWNER_EMAIL && userEmail === OWNER_EMAIL) isOwner = true;
  }

  // Also honour email fallback when profiles table has no owner set
  if (!isOwner && OWNER_EMAIL && userEmail === OWNER_EMAIL) isOwner = true;

  // ---- Owner-only routes ----
  if (restPath.startsWith("/head")) {
    if (!isOwner) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/reader`;
      return NextResponse.redirect(url);
    }
    return res;
  }

  if (restPath.startsWith("/studio")) {
    if (!isOwner) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/profile`;
      return NextResponse.redirect(url);
    }
    return res;
  }

  // Publisher — any logged-in user
  if (restPath.startsWith("/publisher")) {
    return res;
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
