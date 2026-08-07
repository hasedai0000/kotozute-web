import { apiFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Sanctum の CSRF エンドポイントは /api の外（`/sanctum/csrf-cookie`）に置かれるため、
// NEXT_PUBLIC_API_URL から origin だけ抜き出してベースにする。
export const resolveApiOrigin = (): string => {
  if (!API_URL) return "";
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
};

const XSRF_COOKIE_NAME = "XSRF-TOKEN";

export const readXsrfToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const cookie of cookies) {
    const eq = cookie.indexOf("=");
    if (eq === -1) continue;
    if (cookie.slice(0, eq) === XSRF_COOKIE_NAME) {
      return decodeURIComponent(cookie.slice(eq + 1));
    }
  }
  return null;
};

export async function getCsrfCookie(): Promise<void> {
  const origin = resolveApiOrigin();
  await apiFetch<void>("/sanctum/csrf-cookie", {
    method: "GET",
    baseUrl: origin,
  });
}
