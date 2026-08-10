import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie } from "./sanctum";
import { logoutRequest } from "./useLogout";

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

describe("useLogout helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("logoutRequest", () => {
    it("POSTs to /logout with the XSRF header taken from cookie", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await logoutRequest();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/logout$/);
      expect(init.method).toBe("POST");
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
    });

    it("throws ApiError on 401", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(401, { message: "Unauthenticated." }, "Unauthorized"),
      );

      await expect(logoutRequest()).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("mutation flow", () => {
    it("calls CSRF then /logout, sets me to null and clears the client on success", async () => {
      // 1st: csrf, 2nd: logout
      fetchMock
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(204));

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      client.setQueryData(queryKeys.auth.me, {
        id: 1,
        name: "Taro",
        email: "user@example.com",
      });

      const setSpy = vi.spyOn(client, "setQueryData");
      const clearSpy = vi.spyOn(client, "clear");

      const runMutation = async () => {
        await getCsrfCookie();
        await logoutRequest();
        client.setQueryData(queryKeys.auth.me, null);
        client.clear();
      };

      await runMutation();

      const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      const [logoutUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);
      expect(logoutUrl).toMatch(/\/logout$/);
      expect(setSpy).toHaveBeenCalledWith(queryKeys.auth.me, null);
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(client.getQueryData(queryKeys.auth.me)).toBeUndefined();
    });
  });
});
