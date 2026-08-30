// Sanctum のセッション cookie 名は APP_NAME 由来で変わる。Laravel の config/session.php は
// Str::slug(APP_NAME).'-session' で組み立てるため、区切りは常にハイフン。
// httpOnly のため値は読めず、存在有無だけで「ログイン中かも」を一次判定する。
// 実際の認可はサーバ側の 401 で確定させる。
export const DEFAULT_SESSION_COOKIE = "laravel-session";
export const SESSION_COOKIE_SUFFIX = "-session";

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
