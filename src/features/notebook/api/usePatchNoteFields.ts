import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getCsrfCookie, readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { SectionSlug } from "../constants/sections";

// 差分だけを送る（RHF が保持するフォーム値の Partial）。
export type PatchNoteFieldsInput = Partial<Record<string, string>>;

export async function patchNoteFields(
  section: SectionSlug,
  input: PatchNoteFieldsInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(`/note-fields/${section}`, {
    method: "PATCH",
    json: { fields: input },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function usePatchNoteFields(section: SectionSlug) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PatchNoteFieldsInput) => {
      // XSRF-TOKEN クッキーの失効で 419 になるのを防ぐため、書き込み前に必ず更新する。
      await getCsrfCookie();
      await patchNoteFields(section, input);
    },
    onSuccess: async () => {
      // 進捗値（filledFields）が変わるので notebook.summary を再取得。
      // notebook.fields(section) 自体は RHF 側が真実なので invalidate しない。
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notebook.summary,
      });
    },
  });
}
