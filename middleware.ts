import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "mn", "ko", "ja"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

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
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ---- Role check ----
  let role: string = "reader";

  // Owner email always gets owner access regardless of DB state
  const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL || "";
  if (ownerEmail && user.email === ownerEmail) {
    role = "owner";
  } else {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.role) {
        role = profile.role;
      }
    } catch {
      // profiles table not ready yet
    }
  }

  const isOwner = role === "owner";
  const isCreator = role === "creator" || isOwner;

  // ---- Owner-only routes ----
  if (restPath.startsWith("/head")) {
    if (!isOwner) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/reader`;
      return NextResponse.redirect(url);
    }
    return res;
  }

  // ---- Creator + owner routes ----
  if (restPath.startsWith("/studio")) {
    if (!isCreator) {
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

  // Wallet — any logged-in user
  if (restPath.startsWith("/wallet")) {
    return res;
  }

  // Kids portal — any logged-in user (kids + adults)
  if (restPath.startsWith("/kids")) {
    return res;
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
