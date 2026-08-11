import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import {
  SECTION_ORDER,
  type SectionSlug,
} from "../constants/sections";

// TODO(#20+): OpenAPI に /note-summary が定義され次第、src/types/generated から型を差し替える。
export type NoteSectionSummary = {
  filledFields: number;
  entryCountByCategory: Partial<Record<string, number>>;
};

export type NoteSummary = {
  perSection: Record<SectionSlug, NoteSectionSummary>;
  messagesCount: number;
};

const EMPTY_SECTION: NoteSectionSummary = {
  filledFields: 0,
  entryCountByCategory: {},
};

function buildEmptySummary(): NoteSummary {
  const perSection = SECTION_ORDER.reduce(
    (acc, slug) => {
      acc[slug] = { ...EMPTY_SECTION, entryCountByCategory: {} };
      return acc;
    },
    {} as Record<SectionSlug, NoteSectionSummary>,
  );
  return { perSection, messagesCount: 0 };
}

export async function fetchNoteSummary(): Promise<NoteSummary> {
  try {
    return await apiFetch<NoteSummary>("/note-summary");
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      return buildEmptySummary();
    }
    throw err;
  }
}

export function useNoteSummary() {
  return useQuery({
    queryKey: queryKeys.notebook.summary,
    queryFn: fetchNoteSummary,
    retry: false,
    staleTime: 30_000,
  });
}
