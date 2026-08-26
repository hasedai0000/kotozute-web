// Sanctum のセッション cookie 名は APP_NAME 由来で変わる（既定は `laravel_session`）。
// httpOnly のため値は読めず、存在有無だけで「ログイン中かも」を一次判定する。
// 実際の認可はサーバ側の 401 で確定させる。
export const DEFAULT_SESSION_COOKIE = "laravel_session";
export const SESSION_COOKIE_SUFFIX = "_session";

export type NamedCookie = { name: string };

export const hasSessionCookieFromCookies = (
  cookies: readonly NamedCookie[],
): boolean => {
  for (const cookie of cookies) {
    if (
      cookie.name === DEFAULT_SESSION_COOKIE ||
      cookie.name.endsWith(SESSION_COOKIE_SUFFIX)
    ) {
      return true;
    }
  }
  return false;
};
