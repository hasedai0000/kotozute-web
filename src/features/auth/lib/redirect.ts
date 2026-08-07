// open redirect 対策: `/foo` のような同一オリジン相対パスのみ許可し、
// `//evil.com` や `https://…` は弾く。
export const sanitizeRedirect = (raw: string | null): string | null => {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
};
