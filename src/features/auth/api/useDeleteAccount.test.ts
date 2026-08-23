import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie } from "./sanctum";
import { deleteAccountRequest } from "./useDeleteAccount";

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

describe("useDeleteAccount helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("deleteAccountRequest", () => {
    it("DELETEs /user with password and the XSRF header taken from cookie", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await deleteAccountRequest({ currentPassword: "secret" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/user$/);
      expect(init.method).toBe("DELETE");
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
      expect(init.body).toBe(JSON.stringify({ password: "secret" }));
    });

    it("throws ApiError with field errors on 422", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: { password: ["現在のパスワードが正しくありません"] },
          },
          "Unprocessable Entity",
        ),
      );

      await expect(
        deleteAccountRequest({ currentPassword: "wrong" }),
      ).rejects.toMatchObject({
        status: 422,
        fields: { password: ["現在のパスワードが正しくありません"] },
      });
    });
  });

  describe("mutation flow", () => {
    it("calls CSRF then DELETE, sets me to null and clears the client on success", async () => {
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

      await getCsrfCookie();
      await deleteAccountRequest({ currentPassword: "secret" });
      client.setQueryData(queryKeys.auth.me, null);
      client.clear();

      const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      const [deleteUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);
      expect(deleteUrl).toMatch(/\/user$/);
      expect(setSpy).toHaveBeenCalledWith(queryKeys.auth.me, null);
      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(client.getQueryData(queryKeys.auth.me)).toBeUndefined();
    });
  });
});
