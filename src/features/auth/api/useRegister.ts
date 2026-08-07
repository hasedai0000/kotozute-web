import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie, readXsrfToken } from "./sanctum";

import type { RegisterInput } from "@/features/auth/schema/register";

export async function registerRequest(input: RegisterInput): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>("/register", {
    method: "POST",
    // Laravel Fortify は snake_case の password_confirmation を要求する。
    json: {
      name: input.name,
      email: input.email,
      password: input.password,
      password_confirmation: input.passwordConfirmation,
    },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await getCsrfCookie();
      await registerRequest(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}
