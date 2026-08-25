import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { Invitation } from "./useInvitations";

// TODO(#32+): OpenAPI に POST /family/invitations/{id}/resend が定義され次第、src/types/generated から型を差し替える。

export type ResendInviteInput = { id: number | string };

type ResendContext = {
  previous: Invitation[] | undefined;
};

export async function resendInvite({
  id,
}: ResendInviteInput): Promise<Invitation> {
  const token = readXsrfToken();
  return await apiFetch<Invitation>(
    `/family/invitations/${encodeURIComponent(String(id))}/resend`,
    {
      method: "POST",
      headers: token ? { "X-XSRF-TOKEN": token } : undefined,
    },
  );
}

export function useResendInvite() {
  const qc = useQueryClient();

  return useMutation<Invitation, unknown, ResendInviteInput, ResendContext>({
    mutationFn: (input) => resendInvite(input),
    onMutate: async () => {
      const key = queryKeys.family.invitations;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Invitation[]>(key);
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.family.invitations, ctx.previous);
      }
      toast.error("再送に失敗しました。時間をおいて再度お試しください。");
    },
    onSuccess: (server) => {
      const key = queryKeys.family.invitations;
      qc.setQueryData<Invitation[]>(key, (curr) =>
        curr
          ? curr.map((inv) => (inv.id === server.id ? server : inv))
          : [server],
      );
      toast.success("招待メールを再送しました。");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.family.invitations });
    },
  });
}
