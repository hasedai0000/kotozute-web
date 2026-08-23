import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getCsrfCookie, readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { NOTE_PREFERENCES_ENDPOINT } from "./useNotePreferences";

import type {
  DefaultTimingInput,
  NotePreferences,
} from "@/features/settings/schema/notePreferences";

export async function updateDefaultTimingRequest(
  input: DefaultTimingInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(NOTE_PREFERENCES_ENDPOINT, {
    method: "PUT",
    json: { default_timing: input.defaultTiming },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useUpdateDefaultTiming() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DefaultTimingInput) => {
      await getCsrfCookie();
      await updateDefaultTimingRequest(input);
      return input;
    },
    onSuccess: async (next) => {
      const prev = queryClient.getQueryData<NotePreferences>(
        queryKeys.settings.notePreferences,
      );
      if (prev) {
        queryClient.setQueryData<NotePreferences>(
          queryKeys.settings.notePreferences,
          { ...prev, defaultTiming: next.defaultTiming },
        );
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.settings.notePreferences,
      });
    },
  });
}
