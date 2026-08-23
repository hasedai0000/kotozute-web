import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getCsrfCookie, readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { NOTE_PREFERENCES_ENDPOINT } from "./useNotePreferences";

import type {
  GracePeriodInput,
  NotePreferences,
} from "@/features/settings/schema/notePreferences";

export async function updateGracePeriodRequest(
  input: GracePeriodInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(NOTE_PREFERENCES_ENDPOINT, {
    method: "PUT",
    json: { grace_period_days: input.gracePeriodDays },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useUpdateGracePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GracePeriodInput) => {
      await getCsrfCookie();
      await updateGracePeriodRequest(input);
      return input;
    },
    onSuccess: async (next) => {
      const prev = queryClient.getQueryData<NotePreferences>(
        queryKeys.settings.notePreferences,
      );
      if (prev) {
        queryClient.setQueryData<NotePreferences>(
          queryKeys.settings.notePreferences,
          { ...prev, gracePeriodDays: next.gracePeriodDays },
        );
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.settings.notePreferences,
      });
    },
  });
}
