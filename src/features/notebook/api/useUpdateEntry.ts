import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { TimingVariant } from "../components/TimingBadge";
import type { SectionSlug } from "../constants/sections";

import type { NoteEntriesResponse, NoteEntry } from "./useEntries";

export type UpdateEntryInput = {
  id: string;
  values?: Record<string, string>;
  timing?: TimingVariant;
};

type UpdateEntryContext = {
  previous: NoteEntriesResponse | undefined;
};

export async function updateNoteEntry(
  section: SectionSlug,
  input: UpdateEntryInput,
): Promise<NoteEntry> {
  const token = readXsrfToken();
  const body: Record<string, unknown> = {};
  if (input.values !== undefined) body.values = input.values;
  if (input.timing !== undefined) body.timing = input.timing;
  return await apiFetch<NoteEntry>(
    `/note-entries/${section}/${encodeURIComponent(input.id)}`,
    {
      method: "PATCH",
      json: body,
      headers: token ? { "X-XSRF-TOKEN": token } : undefined,
    },
  );
}

export function useUpdateEntry(section: SectionSlug) {
  const qc = useQueryClient();
  const key = queryKeys.notebook.entries(section);

  return useMutation<NoteEntry, unknown, UpdateEntryInput, UpdateEntryContext>({
    mutationFn: (input) => updateNoteEntry(section, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NoteEntriesResponse>(key);
      if (previous) {
        qc.setQueryData<NoteEntriesResponse>(key, {
          entries: previous.entries.map((e) =>
            e.id === input.id
              ? {
                  ...e,
                  values: input.values ?? e.values,
                  timing: input.timing ?? e.timing,
                }
              : e,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(key, ctx.previous);
      }
      toast.error("更新できませんでした");
    },
    onSuccess: (serverEntry) => {
      const current = qc.getQueryData<NoteEntriesResponse>(key);
      if (current) {
        qc.setQueryData<NoteEntriesResponse>(key, {
          entries: current.entries.map((e) =>
            e.id === serverEntry.id ? serverEntry : e,
          ),
        });
      }
      toast.success("更新しました");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notebook.summary });
    },
  });
}
