import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { FamilyMember } from "./useFamilyMembers";

// TODO(#33+): OpenAPI に DELETE /family/members/{id} が定義され次第、src/types/generated から型を差し替える。

export type RevokeMemberInput = { id: number | string };

type RevokeContext = {
  previous: FamilyMember[] | undefined;
};

export async function revokeMember({ id }: RevokeMemberInput): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(`/family/members/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useRevokeMember() {
  const qc = useQueryClient();

  return useMutation<void, unknown, RevokeMemberInput, RevokeContext>({
    mutationFn: (input) => revokeMember(input),
    onMutate: async ({ id }) => {
      const key = queryKeys.family.members;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FamilyMember[]>(key);
      qc.setQueryData<FamilyMember[]>(key, (curr) =>
        curr ? curr.filter((m) => m.id !== id) : curr,
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.family.members, ctx.previous);
      }
      toast.error(
        "権限の解除に失敗しました。時間をおいて再度お試しください。",
      );
    },
    onSuccess: () => {
      toast.success("権限を解除しました。");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.family.members });
    },
  });
}
