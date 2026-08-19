import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { TimingVariant } from "../components/TimingBadge";
import type { CategorySlug } from "../constants/categories";
import type { SectionSlug } from "../constants/sections";

import type { NoteEntriesResponse, NoteEntry } from "./useEntries";

// TODO(#24): timing の UI 選択は #24 で追加。当面は "always" を既定にする。
export type AddEntryInput = {
  category: CategorySlug;
  values: Record<string, string>;
  timing?: TimingVariant;
};

type AddEntryContext = {
  previous: NoteEntriesResponse | undefined;
  tempId: string;
};

export async function addNoteEntry(
  section: SectionSlug,
  input: AddEntryInput,
): Promise<NoteEntry> {
  const token = readXsrfToken();
  return await apiFetch<NoteEntry>(`/note-entries/${section}`, {
    method: "POST",
    json: {
      category: input.category,
      values: input.values,
      timing: input.timing ?? "always",
    },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

// crypto.randomUUID が使えない環境向けのフォールバック（SSR / 古いテスト環境）。
const genTempId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `temp-${crypto.randomUUID()}`;
  }
  return `temp-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

export function useAddEntry(section: SectionSlug) {
  const qc = useQueryClient();
  const key = queryKeys.notebook.entries(section);

  return useMutation<NoteEntry, unknown, AddEntryInput, AddEntryContext>({
    mutationFn: (input) => addNoteEntry(section, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NoteEntriesResponse>(key);
      const tempId = genTempId();
      const tempEntry: NoteEntry = {
        id: tempId,
        category: input.category,
        values: input.values,
        timing: input.timing ?? "always",
      };
      qc.setQueryData<NoteEntriesResponse>(key, {
        entries: [...(previous?.entries ?? []), tempEntry],
      });
      return { previous, tempId };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(key, ctx.previous);
      } else {
        qc.setQueryData<NoteEntriesResponse>(key, { entries: [] });
      }
      toast.error("追加できませんでした");
    },
    onSuccess: (serverEntry, _input, ctx) => {
      const current = qc.getQueryData<NoteEntriesResponse>(key);
      if (current) {
        qc.setQueryData<NoteEntriesResponse>(key, {
          entries: current.entries.map((e) =>
            e.id === ctx.tempId ? serverEntry : e,
          ),
        });
      }
      toast.success("追加しました");
    },
    onSettled: () => {
      // entryCountByCategory を再取得。
      qc.invalidateQueries({ queryKey: queryKeys.notebook.summary });
    },
  });
}
