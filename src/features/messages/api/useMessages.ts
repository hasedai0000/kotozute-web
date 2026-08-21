import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { Message } from "../schema/message";

// TODO(#20+): OpenAPI に /messages が定義され次第、src/types/generated から型を差し替える。
export type MessagesResponse = {
  messages: Message[];
};

export async function fetchMessages(): Promise<MessagesResponse> {
  try {
    return await apiFetch<MessagesResponse>("/messages");
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      // まだ何も登録されていない or バック未実装。空を返して UI を落とさない。
      return { messages: [] };
    }
    throw err;
  }
}

export function useMessages() {
  return useQuery({
    queryKey: queryKeys.messages.list,
    queryFn: fetchMessages,
    retry: false,
    staleTime: 30_000,
  });
}
