import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie, readXsrfToken } from "./sanctum";

import type { LoginInput } from "@/features/auth/schema/login";

export async function loginRequest(input: LoginInput): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>("/auth/login", {
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
