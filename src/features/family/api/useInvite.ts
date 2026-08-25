import { useMutation, useQueryClient } from "@tanstack/react-query";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { InviteInput } from "../schema/invite";

import type { Invitation } from "./useInvitations";

// TODO(#32+): OpenAPI に POST /family/invitations が定義され次第、src/types/generated から型を差し替える。

type InviteContext = {
  previous: Invitation[] | undefined;
  optimisticId: string;
};

export async function inviteFamily(input: InviteInput): Promise<Invitation> {
  const token = readXsrfToken();
  return await apiFetch<Invitation>("/family/invitations", {
    method: "POST",
    json: input,
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useInvite() {
  const qc = useQueryClient();

  return useMutation<Invitation, unknown, InviteInput, InviteContext>({
    mutationFn: (input) => inviteFamily(input),
    onMutate: async (input) => {
      const key = queryKeys.family.invitations;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Invitation[]>(key);
      const optimisticId = `temp-${Date.now()}`;
      const optimistic: Invitation = {
        id: optimisticId,
        email: input.email,
        expiresAt: "",
        status: "pending",
      };
      qc.setQueryData<Invitation[]>(key, (curr) =>
        curr ? [...curr, optimistic] : [optimistic],
      );
      return { previous, optimisticId };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.family.invitations, ctx.previous);
      }
    },
    onSuccess: (server, _input, ctx) => {
      const key = queryKeys.family.invitations;
      qc.setQueryData<Invitation[]>(key, (curr) => {
        if (!curr) return [server];
        const replaced = curr.map((inv) =>
          inv.id === ctx?.optimisticId ? server : inv,
        );
        return replaced.some((inv) => inv.id === server.id)
          ? replaced
          : [...replaced, server];
      });
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.family.invitations });
    },
  });
}
