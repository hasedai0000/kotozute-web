import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/queryKeys";

import {
  REMINDER_ENABLED_DEFAULT,
  type NotificationPreferences,
} from "@/features/settings/schema/notifications";

// TODO(#W1-08+): OpenAPI 側で /user/notifications が定義され次第、
// src/types/generated から型を差し替える。
export const NOTIFICATIONS_ENDPOINT = "/user/notifications";

type NotificationsResponse = {
  reminder_enabled?: boolean;
};

export async function fetchNotifications(): Promise<NotificationPreferences> {
  try {
    const raw = await apiFetch<NotificationsResponse>(NOTIFICATIONS_ENDPOINT);
    return {
      reminderEnabled: raw.reminder_enabled ?? REMINDER_ENABLED_DEFAULT,
    };
  } catch (err) {
    if (ApiError.isApiError(err) && err.status === 404) {
      return { reminderEnabled: REMINDER_ENABLED_DEFAULT };
    }
    throw err;
  }
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.settings.notifications,
    queryFn: fetchNotifications,
    staleTime: 30_000,
  });
}
