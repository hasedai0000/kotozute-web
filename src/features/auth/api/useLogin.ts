import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { LoginInput } from "@/features/auth/schema/login";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Sanctum の CSRF エンドポイントは /api の外（`/sanctum/csrf-cookie`）に置かれるため、
// NEXT_PUBLIC_API_URL から origin だけ抜き出してベースにする。
const resolveApiOrigin = (): string => {
  if (!API_URL) return "";
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
};

const XSRF_COOKIE_NAME = "XSRF-TOKEN";

const readXsrfToken = (): string | null => {
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

export async function loginRequest(input: LoginInput): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>("/login", {
    method: "POST",
    json: input,
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      await getCsrfCookie();
      await loginRequest(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}
