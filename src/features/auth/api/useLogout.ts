import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie, readXsrfToken } from "./sanctum";

export async function logoutRequest(): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>("/logout", {
    method: "POST",
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await getCsrfCookie();
      await logoutRequest();
    },
    onSuccess: () => {
      // me を先に null 確定させて Header の UserMenu を即座に「ログイン」に切り替え、
      // 続けて clear() で他機能のキャッシュも一掃する。
      queryClient.setQueryData(queryKeys.auth.me, null);
      queryClient.clear();
    },
  });
}
