import { NextResponse, type NextRequest } from "next/server";

import { hasSessionCookieFromCookies } from "@/lib/auth/session-cookie";

export function middleware(req: NextRequest) {
  if (hasSessionCookieFromCookies(req.cookies.getAll())) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set(
    "redirect",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

// (app) 配下の実パス。追加時は plan / screen_spec と揃える。
export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/notebook",
    "/notebook/:path*",
    "/messages",
    "/messages/:path*",
    "/family",
    "/family/:path*",
    "/preview",
    "/preview/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
