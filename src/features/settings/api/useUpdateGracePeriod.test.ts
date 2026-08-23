import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCsrfCookie } from "@/features/auth/api/sanctum";
import { queryKeys } from "@/lib/query/queryKeys";

import { updateGracePeriodRequest } from "./useUpdateGracePeriod";

import type { NotePreferences } from "@/features/settings/schema/notePreferences";

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

describe("useUpdateGracePeriod helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("updateGracePeriodRequest", () => {
    it("PUTs /user/note-preferences with grace_period_days only", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await updateGracePeriodRequest({ gracePeriodDays: 14 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/user\/note-preferences$/);
      expect(init.method).toBe("PUT");
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
      expect(init.body).toBe(JSON.stringify({ grace_period_days: 14 }));
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
      client.setQueryData<NotePreferences>(
        queryKeys.settings.notePreferences,
        { defaultTiming: "always", gracePeriodDays: 7 },
      );
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      await getCsrfCookie();
      await updateGracePeriodRequest({ gracePeriodDays: 21 });
      const prev = client.getQueryData<NotePreferences>(
        queryKeys.settings.notePreferences,
      );
      if (prev) {
        client.setQueryData<NotePreferences>(
          queryKeys.settings.notePreferences,
          { ...prev, gracePeriodDays: 21 },
        );
      }
      await client.invalidateQueries({
        queryKey: queryKeys.settings.notePreferences,
      });

      const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);

      expect(
        client.getQueryData<NotePreferences>(queryKeys.settings.notePreferences),
      ).toEqual({ defaultTiming: "always", gracePeriodDays: 21 });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.settings.notePreferences,
      });
    });
  });
});
