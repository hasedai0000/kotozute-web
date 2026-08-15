import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import type { SectionSlug } from "../constants/sections";

// TODO(#20+): OpenAPI に /note-fields/:section が定義され次第、src/types/generated から型を差し替える。
export type NoteFieldsResponse = {
  fields: Record<string, string>;
};

export async function fetchNoteFields(
  section: SectionSlug,
): Promise<NoteFieldsResponse> {
  try {
    return await apiFetch<NoteFieldsResponse>(`/note-fields/${section}`);
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      // まだ何も保存されていない or バック未実装。空を返して UI を落とさない。
      return { fields: {} };
    }
    throw err;
  }
}

export function useNoteFields(section: SectionSlug) {
  return useQuery({
    queryKey: queryKeys.notebook.fields(section),
    queryFn: () => fetchNoteFields(section),
    retry: false,
    staleTime: 30_000,
  });
}
