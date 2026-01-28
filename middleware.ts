import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "mn", "ko", "ja"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

const OWNER_EMAIL = "huslen.mungun1@gmail.com";

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
  const first = parts[1]; // "" | "en" | "studio" ...

  // If no locale in URL, force /en + keep path
  if (!isLocale(first)) {
    const url = req.nextUrl.clone();
    url.pathname = `/en${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  const restPath = "/" + parts.slice(2).join("/"); // "/studio/..", "/reader", "" -> "/"

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

  // OPTIONAL: if owner tries to go to /publisher, send them to /head instead
  // (remove this block if you want owner to access publisher too)
  if (userEmail === OWNER_EMAIL && restPath.startsWith("/publisher")) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/head`;
    return NextResponse.redirect(url);
  }

  // HEAD admin: only your email allowed
  if (restPath.startsWith("/head")) {
    if (userEmail !== OWNER_EMAIL) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/reader`;
      return NextResponse.redirect(url);
    }
  }

  // STUDIO + PUBLISHER: any logged-in user allowed
  if (restPath.startsWith("/studio") || restPath.startsWith("/publisher")) {
    return res;
  }

  // Default allow
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
