import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getCsrfCookie, readXsrfToken } from "@/features/auth/api/sanctum";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import { NOTIFICATIONS_ENDPOINT } from "./useNotifications";

import type {
  NotificationPreferences,
  NotificationsInput,
} from "@/features/settings/schema/notifications";

export async function updateNotificationsRequest(
  input: NotificationsInput,
): Promise<void> {
  const token = readXsrfToken();
  await apiFetch<void>(NOTIFICATIONS_ENDPOINT, {
    method: "PUT",
    json: { reminder_enabled: input.reminderEnabled },
    headers: token ? { "X-XSRF-TOKEN": token } : undefined,
  });
}

export function useUpdateNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NotificationsInput) => {
      await getCsrfCookie();
      await updateNotificationsRequest(input);
      return input;
    },
    onSuccess: async (next) => {
      queryClient.setQueryData<NotificationPreferences>(
        queryKeys.settings.notifications,
        { reminderEnabled: next.reminderEnabled },
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.settings.notifications,
      });
    },
  });
}
