import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie } from "./sanctum";
import { updateProfileRequest } from "./useUpdateProfile";

import type { AuthUser } from "./useMe";

const jsonResponse = (
  status: number,
  body: unknown = null,
  statusText = "",
): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    statusText,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

describe("useUpdateProfile helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("updateProfileRequest", () => {
    it("PUTs to /user/profile-information with the XSRF header taken from cookie", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await updateProfileRequest({
        name: "山田 太郎",
        email: "taro@example.com",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/user\/profile-information$/);
      expect(init.method).toBe("PUT");
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(init.body).toBe(
        JSON.stringify({ name: "山田 太郎", email: "taro@example.com" }),
      );
    });

    it("throws ApiError on 422 with field errors", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: {
              email: ["このメールアドレスは既に使用されています。"],
            },
          },
          "Unprocessable Entity",
        ),
      );

      await expect(
        updateProfileRequest({ name: "山田 太郎", email: "taro@example.com" }),
      ).rejects.toMatchObject({
        status: 422,
        fields: { email: ["このメールアドレスは既に使用されています。"] },
      });
    });
  });

  describe("mutation flow", () => {
    it("calls CSRF then PUT, updates the me cache, and invalidates it", async () => {
      // 1st: csrf, 2nd: profile update
      fetchMock
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(204));

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      client.setQueryData<AuthUser>(queryKeys.auth.me, {
        id: 1,
        name: "旧名前",
        email: "old@example.com",
        role: "owner",
      });

      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      const runMutation = async (input: {
        name: string;
        email: string;
      }) => {
        await getCsrfCookie();
        await updateProfileRequest(input);
        const prev = client.getQueryData<AuthUser | null>(queryKeys.auth.me);
        if (prev) {
          client.setQueryData<AuthUser>(queryKeys.auth.me, {
            ...prev,
            name: input.name,
            email: input.email,
          });
        }
        await client.invalidateQueries({ queryKey: queryKeys.auth.me });
      };

      await runMutation({ name: "新名前", email: "new@example.com" });

      const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      const [updateUrl, updateInit] = fetchMock.mock.calls[1] as [
        string,
        RequestInit,
      ];
      expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);
      expect(updateUrl).toMatch(/\/user\/profile-information$/);
      expect(updateInit.method).toBe("PUT");

      const cached = client.getQueryData<AuthUser>(queryKeys.auth.me);
      expect(cached).toEqual({
        id: 1,
        name: "新名前",
        email: "new@example.com",
        role: "owner",
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.auth.me,
      });
    });
  });
});
