import { NextResponse, type NextRequest } from "next/server";

// Sanctum のセッションクッキーは APP_NAME 由来で名前が変わる（既定は `laravel_session`）。
// httpOnly クッキーの中身は middleware から読めないため、存在有無だけで一次防衛する。
// 実際の認可は API 側の 401 で確定させる（後続 Issue で 401 自動リダイレクトを実装）。
const SESSION_COOKIE_SUFFIX = "_session";
const DEFAULT_SESSION_COOKIE = "laravel_session";

const hasSessionCookie = (req: NextRequest): boolean => {
  for (const cookie of req.cookies.getAll()) {
    if (
      cookie.name === DEFAULT_SESSION_COOKIE ||
      cookie.name.endsWith(SESSION_COOKIE_SUFFIX)
    ) {
      return true;
    }
  }
  return false;
};

export function middleware(req: NextRequest) {
  if (hasSessionCookie(req)) {
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
