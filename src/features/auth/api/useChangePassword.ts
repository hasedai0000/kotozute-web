import { useMutation } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import { getCsrfCookie, readXsrfToken } from "./sanctum";

import type { PasswordChangeInput } from "@/features/auth/schema/passwordChange";

// TODO(#W1-08+): OpenAPI 側で /user/password が定義され次第、
// src/types/generated から型を差し替える。バック側のエンドポイント名が
// Fortify デフォルト（/user/password）と異なる場合は URL を差し替える。
const PASSWORD_ENDPOINT = "/user/password";

export async function changePasswordRequest(
  input: PasswordChangeInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(PASSWORD_ENDPOINT, {
    method: "PUT",
    // Laravel Fortify は snake_case の current_password / password_confirmation を要求する。
    json: {
      current_password: input.currentPassword,
      password: input.newPassword,
      password_confirmation: input.newPasswordConfirmation,
    },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: PasswordChangeInput) => {
      await getCsrfCookie();
      await changePasswordRequest(input);
    },
  });
}
