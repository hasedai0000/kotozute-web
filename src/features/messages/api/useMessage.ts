import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { Message } from "../schema/message";

// TODO(#20+): OpenAPI に /messages/{id} が定義され次第、src/types/generated から型を差し替える。
export type MessageResponse = {
  message: Message;
};

export async function fetchMessage(id: string): Promise<MessageResponse> {
  return await apiFetch<MessageResponse>(`/messages/${encodeURIComponent(id)}`);
}

export function useMessage(id: string) {
  return useQuery({
    queryKey: queryKeys.messages.detail(id),
    queryFn: () => fetchMessage(id),
    retry: false,
    staleTime: 30_000,
  });
}
