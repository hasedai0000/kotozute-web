import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCsrfCookie } from "@/features/auth/api/sanctum";
import { queryKeys } from "@/lib/query/queryKeys";

import { updateNotificationsRequest } from "./useUpdateNotifications";

import type { NotificationPreferences } from "@/features/settings/schema/notifications";

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

describe("useUpdateNotifications helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("updateNotificationsRequest", () => {
    it("PUTs /user/notifications with reminder_enabled only", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await updateNotificationsRequest({ reminderEnabled: true });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/user\/notifications$/);
      expect(init.method).toBe("PUT");
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
      expect(init.body).toBe(JSON.stringify({ reminder_enabled: true }));
    });
  });

  describe("mutation flow", () => {
    it("calls CSRF then PUT, patches the cache, and invalidates it", async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(204));

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      client.setQueryData<NotificationPreferences>(
        queryKeys.settings.notifications,
        { reminderEnabled: false },
      );
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      await getCsrfCookie();
      await updateNotificationsRequest({ reminderEnabled: true });
      client.setQueryData<NotificationPreferences>(
        queryKeys.settings.notifications,
        { reminderEnabled: true },
      );
      await client.invalidateQueries({
        queryKey: queryKeys.settings.notifications,
      });

      const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);

      expect(
        client.getQueryData<NotificationPreferences>(
          queryKeys.settings.notifications,
        ),
      ).toEqual({ reminderEnabled: true });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.settings.notifications,
      });
    });
  });
});
