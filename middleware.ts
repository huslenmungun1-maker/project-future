import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // PUBLIC pages
  if (path.startsWith("/reader") || path === "/") {
    return res;
  }

  // Create a Supabase middleware client
  const supabase = createMiddlewareClient({ req, res });

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no login → redirect to login page
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const userEmail = session.user.email;

  // HEAD ADMIN — only your email allowed
  if (path.startsWith("/head")) {
    if (userEmail !== "huslen.mungun1@gmail.com") {
      return NextResponse.redirect(new URL("/reader", req.url));
    }
  }

  // STUDIO — any logged-in user allowed
  if (path.startsWith("/studio")) {
    return res;
  }

  return res;
}

export const config = {
  matcher: ["/", "/reader/:path*", "/studio/:path*", "/head/:path*"],
};
