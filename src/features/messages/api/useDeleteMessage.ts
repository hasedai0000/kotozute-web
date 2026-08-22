import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { MessagesResponse } from "./useMessages";

export type DeleteMessageInput = {
  id: string;
};

type DeleteMessageContext = {
  previousList: MessagesResponse | undefined;
};

export async function deleteMessage(
  input: DeleteMessageInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(`/messages/${encodeURIComponent(input.id)}`, {
    method: "DELETE",
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  const listKey = queryKeys.messages.list;

  return useMutation<void, unknown, DeleteMessageInput, DeleteMessageContext>({
    mutationFn: (input) => deleteMessage(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previousList = qc.getQueryData<MessagesResponse>(listKey);
      if (previousList) {
        qc.setQueryData<MessagesResponse>(listKey, {
          messages: previousList.messages.filter((m) => m.id !== input.id),
        });
      }
      return { previousList };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previousList !== undefined) {
        qc.setQueryData(listKey, ctx.previousList);
      }
      toast.error("削除できませんでした");
    },
    onSuccess: (_res, input) => {
      qc.removeQueries({ queryKey: queryKeys.messages.detail(input.id) });
      toast.success("削除しました");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notebook.summary });
    },
  });
}
