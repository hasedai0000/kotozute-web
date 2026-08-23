import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie, readXsrfToken } from "./sanctum";

import type { AccountDeletionInput } from "@/features/auth/schema/accountDeletion";

// TODO(#W1-08+): OpenAPI 側で DELETE /user が定義され次第、
// src/types/generated から型を差し替える。バック側の Fortify で
// Features::accountDeletion() が有効化されている前提。
const ACCOUNT_DELETION_ENDPOINT = "/user";

export async function deleteAccountRequest(
  input: AccountDeletionInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(ACCOUNT_DELETION_ENDPOINT, {
    method: "DELETE",
    json: { password: input.currentPassword },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AccountDeletionInput) => {
      await getCsrfCookie();
      await deleteAccountRequest(input);
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me, null);
      queryClient.clear();
    },
  });
}
