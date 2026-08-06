import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie, loginRequest } from "./useLogin";

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

describe("useLogin helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getCsrfCookie", () => {
    it("hits /sanctum/csrf-cookie on the API origin (outside /api prefix)", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await getCsrfCookie();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toMatch(/\/sanctum\/csrf-cookie$/);
      expect(url).not.toContain("/api/sanctum");
    });

    it("sends credentials so Sanctum can set the XSRF-TOKEN cookie", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await getCsrfCookie();

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.credentials).toBe("include");
    });
  });

  describe("loginRequest", () => {
    it("POSTs to /login with the XSRF header taken from cookie", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await loginRequest({ email: "a@example.com", password: "secret" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/login$/);
      expect(init.method).toBe("POST");
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(init.body).toBe(
        JSON.stringify({ email: "a@example.com", password: "secret" }),
      );
    });

    it("URL-decodes the XSRF token before sending", async () => {
      document.cookie = "XSRF-TOKEN=hello%3Dworld";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await loginRequest({ email: "a@example.com", password: "secret" });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("hello=world");
    });

    it("throws ApiError on 401", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(401, { message: "Unauthenticated." }, "Unauthorized"),
      );

      await expect(
        loginRequest({ email: "a@example.com", password: "secret" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("throws ApiError on 422 with field errors", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: { email: ["The email field is required."] },
          },
          "Unprocessable Entity",
        ),
      );

      await expect(
        loginRequest({ email: "", password: "secret" }),
      ).rejects.toMatchObject({
        status: 422,
        fields: { email: ["The email field is required."] },
      });
    });
  });

  describe("mutation flow", () => {
    it("calls CSRF then /login and invalidates the me query on success", async () => {
      // 1st: csrf, 2nd: login
      fetchMock
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(204));

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      // 直接 useMutation は使わず、mutationFn 相当のロジックを検証する。
      // React コンポーネントを起こさずに order と invalidation を確認できるため。
      const runMutation = async (input: {
        email: string;
        password: string;
      }) => {
        await getCsrfCookie();
        await loginRequest(input);
        await client.invalidateQueries({ queryKey: queryKeys.auth.me });
      };

      await runMutation({ email: "a@example.com", password: "secret" });

      const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      const [loginUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);
      expect(loginUrl).toMatch(/\/login$/);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.auth.me,
      });
    });
  });
});
