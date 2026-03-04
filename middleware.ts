import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "mn", "ko", "ja"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

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

  // If no locale in URL, force /en + keep path
  if (!isLocale(first)) {
    const url = req.nextUrl.clone();
    url.pathname = `/en${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  const restPath = "/" + parts.slice(2).join("/");

  // Public pages (no login required)
  if (
    restPath === "/" ||
    restPath.startsWith("/reader") ||
    restPath.startsWith("/login") ||
    restPath.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  // ---- Auth check (for protected pages) ----
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not logged in -> send to locale login page
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const userEmail = session.user.email || "";

  // ---- OWNER-ONLY routes ----
  const isOwner = OWNER_EMAIL && userEmail === OWNER_EMAIL;

  // Head: owner only
  if (restPath.startsWith("/head")) {
    if (!isOwner) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/reader`;
      return NextResponse.redirect(url);
    }
    return res;
  }

  // Studio: owner only
  if (restPath.startsWith("/studio")) {
    if (!isOwner) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/reader`;
      return NextResponse.redirect(url);
    }
    return res;
  }

  // Publisher: any logged-in user allowed
  if (restPath.startsWith("/publisher")) {
    return res;
  }

  // Default allow
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
