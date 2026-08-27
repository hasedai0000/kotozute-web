import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

// TODO(#35+): OpenAPI に POST /invitations/{token}/accept が定義され次第、src/types/generated から型を差し替える。

export type AcceptInvitationInput = { token: string };

export async function acceptInvitation({
  token,
}: AcceptInvitationInput): Promise<void> {
  const xsrf = readXsrfToken();
  await apiFetch<void>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      headers: xsrf ? { "X-XSRF-TOKEN": xsrf } : undefined,
    },
  );
}

export function useAcceptInvitation() {
  const qc = useQueryClient();

  return useMutation<void, unknown, AcceptInvitationInput>({
    mutationFn: (input) => acceptInvitation(input),
    onSuccess: async () => {
      // 受諾直後は me の role が family に変わる想定なので即時 invalidate。
      // dashboard 到達時に最新の summary を取り直せるよう notebook.summary も落とす。
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
        qc.invalidateQueries({ queryKey: queryKeys.notebook.summary }),
      ]);
    },
    onError: () => {
      toast.error("参加できませんでした。時間をおいて再度お試しください。");
    },
  });
}
