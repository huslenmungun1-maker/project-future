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

// If no locale in URL → redirect to /en
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
restPath.startsWith("/auth")
) {
return NextResponse.next();
}

// ---- Auth check ----
const res = NextResponse.next();
const supabase = createMiddlewareClient({ req, res });

const {
data: { session },
} = await supabase.auth.getSession();

// Not logged in → redirect to login
if (!session) {
const url = req.nextUrl.clone();
url.pathname = `/${locale}/login`;
url.searchParams.set("redirect", pathname);
return NextResponse.redirect(url);
}

const userEmail = session.user.email || "";

// ---- Owner check ----
const isOwner = OWNER_EMAIL && userEmail === OWNER_EMAIL;

// Head → owner only
if (restPath.startsWith("/head")) {
if (!isOwner) {
const url = req.nextUrl.clone();
url.pathname = `/${locale}/reader`;
return NextResponse.redirect(url);
}
return res;
}

// Studio → any logged-in user
if (restPath.startsWith("/studio")) {
return res;
}

// Publisher → any logged-in user
if (restPath.startsWith("/publisher")) {
return res;
}

// Default allow
return res;
}

export const config = {
matcher: ["/((?!_next|api|.*\..*).*)"],
};
