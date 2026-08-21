import { useMutation, useQueryClient } from "@tanstack/react-query";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { Message, MessageInput } from "../schema/message";

import type { MessageResponse } from "./useMessage";
import type { MessagesResponse } from "./useMessages";

export type UpdateMessageInput = {
  id: string;
} & Partial<MessageInput>;

type UpdateMessageContext = {
  previousDetail: MessageResponse | undefined;
  previousList: MessagesResponse | undefined;
};

export async function updateMessage(
  input: UpdateMessageInput,
): Promise<Message> {
  const { id, ...body } = input;
  const token = readXsrfToken();
  return await apiFetch<Message>(`/messages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: body,
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useUpdateMessage() {
  const qc = useQueryClient();

  return useMutation<Message, unknown, UpdateMessageInput, UpdateMessageContext>({
    mutationFn: (input) => updateMessage(input),
    onMutate: async (input) => {
      const detailKey = queryKeys.messages.detail(input.id);
      const listKey = queryKeys.messages.list;
      await Promise.all([
        qc.cancelQueries({ queryKey: detailKey }),
        qc.cancelQueries({ queryKey: listKey }),
      ]);

      const previousDetail = qc.getQueryData<MessageResponse>(detailKey);
      const previousList = qc.getQueryData<MessagesResponse>(listKey);

      if (previousDetail) {
        qc.setQueryData<MessageResponse>(detailKey, {
          message: {
            ...previousDetail.message,
            recipient: input.recipient ?? previousDetail.message.recipient,
            body: input.body ?? previousDetail.message.body,
            timing: input.timing ?? previousDetail.message.timing,
          },
        });
      }

      if (previousList) {
        qc.setQueryData<MessagesResponse>(listKey, {
          messages: previousList.messages.map((m) =>
            m.id === input.id
              ? {
                  ...m,
                  recipient: input.recipient ?? m.recipient,
                  body: input.body ?? m.body,
                  timing: input.timing ?? m.timing,
                }
              : m,
          ),
        });
      }

      return { previousDetail, previousList };
    },
    onError: (_err, input, ctx) => {
      if (ctx?.previousDetail !== undefined) {
        qc.setQueryData(queryKeys.messages.detail(input.id), ctx.previousDetail);
      }
      if (ctx?.previousList !== undefined) {
        qc.setQueryData(queryKeys.messages.list, ctx.previousList);
      }
    },
    onSuccess: (server) => {
      qc.setQueryData<MessageResponse>(queryKeys.messages.detail(server.id), {
        message: server,
      });
    },
  });
}
