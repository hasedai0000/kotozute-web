import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getCsrfCookie, readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { SectionSlug } from "../constants/sections";

import type { NoteEntriesResponse } from "./useEntries";

export type DeleteEntryInput = {
  id: string;
};

type DeleteEntryContext = {
  previous: NoteEntriesResponse | undefined;
};

export async function deleteNoteEntry(
  section: SectionSlug,
  input: DeleteEntryInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(
    `/note-entries/${section}/${encodeURIComponent(input.id)}`,
    {
      method: "DELETE",
      headers: token ? { "X-XSRF-TOKEN": token } : undefined,
    },
  );
}

export function useDeleteEntry(section: SectionSlug) {
  const qc = useQueryClient();
  const key = queryKeys.notebook.entries(section);

  return useMutation<void, unknown, DeleteEntryInput, DeleteEntryContext>({
    mutationFn: async (input) => {
      // XSRF-TOKEN クッキーの失効で 419 になるのを防ぐため、書き込み前に必ず更新する。
      await getCsrfCookie();
      await deleteNoteEntry(section, input);
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NoteEntriesResponse>(key);
      if (previous) {
        qc.setQueryData<NoteEntriesResponse>(key, {
          entries: previous.entries.filter((e) => e.id !== input.id),
        });
      }
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(key, ctx.previous);
      }
      toast.error("削除できませんでした");
    },
    onSuccess: () => {
      toast.success("削除しました");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notebook.summary });
    },
  });
}
