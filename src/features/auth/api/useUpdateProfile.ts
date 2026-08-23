import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie, readXsrfToken } from "./sanctum";
import type { AuthUser } from "./useMe";

import type { ProfileUpdateInput } from "@/features/auth/schema/profile";

// TODO(#W1-08+): OpenAPI 側で /user/profile-information が定義され次第、
// src/types/generated から型を差し替える。バック側のエンドポイント名が
// Fortify デフォルト（/user/profile-information）と異なる場合は URL を差し替える。
const PROFILE_ENDPOINT = "/user/profile-information";

export async function updateProfileRequest(
  input: ProfileUpdateInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(PROFILE_ENDPOINT, {
    method: "PUT",
    json: { name: input.name, email: input.email },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProfileUpdateInput) => {
      await getCsrfCookie();
      await updateProfileRequest(input);
      return input;
    },
    onSuccess: async (next) => {
      const prev = queryClient.getQueryData<AuthUser | null>(
        queryKeys.auth.me,
      );
      if (prev) {
        queryClient.setQueryData<AuthUser>(queryKeys.auth.me, {
          ...prev,
          name: next.name,
          email: next.email,
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}
