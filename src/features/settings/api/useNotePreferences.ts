import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import {
  DEFAULT_TIMING_DEFAULT,
  GRACE_PERIOD_DEFAULT,
  type NotePreferences,
  type TimingValue,
} from "@/features/settings/schema/notePreferences";

// TODO(#W1-08+): OpenAPI 側で /user/note-preferences が定義され次第、
// src/types/generated から型を差し替える。
export const NOTE_PREFERENCES_ENDPOINT = "/user/note-preferences";

type NotePreferencesResponse = {
  default_timing?: TimingValue;
  grace_period_days?: number;
};

export async function fetchNotePreferences(): Promise<NotePreferences> {
  try {
    const raw = await apiFetch<NotePreferencesResponse>(
      NOTE_PREFERENCES_ENDPOINT,
    );
    return {
      defaultTiming: raw.default_timing ?? DEFAULT_TIMING_DEFAULT,
      gracePeriodDays: raw.grace_period_days ?? GRACE_PERIOD_DEFAULT,
    };
  } catch (err) {
    // レコード未作成の初回ユーザー向けに既定値を返す。
    if (ApiError.isApiError(err) && err.status === 404) {
      return {
        defaultTiming: DEFAULT_TIMING_DEFAULT,
        gracePeriodDays: GRACE_PERIOD_DEFAULT,
      };
    }
    throw err;
  }
}

export function useNotePreferences() {
  return useQuery({
    queryKey: queryKeys.settings.notePreferences,
    queryFn: fetchNotePreferences,
    staleTime: 30_000,
  });
}
