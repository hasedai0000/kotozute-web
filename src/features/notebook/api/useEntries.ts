import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { CategorySlug } from "../constants/categories";
import type { SectionSlug } from "../constants/sections";

import type { TimingVariant } from "../components/TimingBadge";

// TODO(#20+): OpenAPI に /note-entries/:section が定義され次第、src/types/generated から型を差し替える。
export type NoteEntry = {
  id: string;
  category: CategorySlug;
  values: Record<string, string>;
  timing: TimingVariant;
  sort_order?: number;
};

export type NoteEntriesResponse = {
  entries: NoteEntry[];
};

export async function fetchNoteEntries(
  section: SectionSlug,
): Promise<NoteEntriesResponse> {
  try {
    return await apiFetch<NoteEntriesResponse>(`/note-entries/${section}`);
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      // まだ何も登録されていない or バック未実装。空を返して UI を落とさない。
      return { entries: [] };
    }
    throw err;
  }
}

export function useEntries(section: SectionSlug) {
  return useQuery({
    queryKey: queryKeys.notebook.entries(section),
    queryFn: () => fetchNoteEntries(section),
    retry: false,
    staleTime: 30_000,
  });
}
