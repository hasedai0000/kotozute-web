import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { Message, MessageInput } from "../schema/message";

export async function createMessage(input: MessageInput): Promise<Message> {
  const token = readXsrfToken();
  return await apiFetch<Message>("/messages", {
    method: "POST",
    json: input,
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useCreateMessage() {
  const qc = useQueryClient();

  return useMutation<Message, unknown, MessageInput>({
    mutationFn: (input) => createMessage(input),
    onSuccess: async (created) => {
      qc.setQueryData(queryKeys.messages.detail(created.id), {
        message: created,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.messages.list }),
        qc.invalidateQueries({ queryKey: queryKeys.notebook.summary }),
      ]);
    },
    onError: () => {
      toast.error("保存できませんでした");
    },
  });
}
