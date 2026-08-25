import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { Invitation } from "./useInvitations";

// TODO(#32+): OpenAPI に DELETE /family/invitations/{id} が定義され次第、src/types/generated から型を差し替える。

export type RevokeInviteInput = { id: number | string };

type RevokeContext = {
  previous: Invitation[] | undefined;
};

export async function revokeInvite({ id }: RevokeInviteInput): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(
    `/family/invitations/${encodeURIComponent(String(id))}`,
    {
      method: "DELETE",
      headers: token ? { "X-XSRF-TOKEN": token } : undefined,
    },
  );
}

export function useRevokeInvite() {
  const qc = useQueryClient();

  return useMutation<void, unknown, RevokeInviteInput, RevokeContext>({
    mutationFn: (input) => revokeInvite(input),
    onMutate: async ({ id }) => {
      const key = queryKeys.family.invitations;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Invitation[]>(key);
      qc.setQueryData<Invitation[]>(key, (curr) =>
        curr ? curr.filter((inv) => inv.id !== id) : curr,
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.family.invitations, ctx.previous);
      }
      toast.error("取り消しに失敗しました。時間をおいて再度お試しください。");
    },
    onSuccess: () => {
      toast.success("招待を取り消しました。");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.family.invitations });
    },
  });
}
