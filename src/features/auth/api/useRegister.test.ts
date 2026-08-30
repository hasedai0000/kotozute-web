import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { getCsrfCookie } from "./sanctum";
import { registerRequest } from "./useRegister";

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

const validInput = {
  name: "山田 太郎",
  email: "taro@example.com",
  password: "password123",
  passwordConfirmation: "password123",
};

describe("useRegister helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("registerRequest", () => {
    it("POSTs to /auth/register with password_confirmation (snake_case) and no passwordConfirmation key", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await registerRequest(validInput);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/auth\/register$/);
      expect(init.method).toBe("POST");

      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
      expect(headers.get("Content-Type")).toBe("application/json");

      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).toEqual({
        name: "山田 太郎",
        email: "taro@example.com",
        password: "password123",
        password_confirmation: "password123",
      });
      expect(body).not.toHaveProperty("passwordConfirmation");
    });

    it("preserves ApiError.fields on 422 (email already taken)", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: {
              email: ["このメールアドレスは既に登録されています。"],
            },
          },
          "Unprocessable Entity",
        ),
      );

      await expect(registerRequest(validInput)).rejects.toMatchObject({
        status: 422,
        fields: {
          email: ["このメールアドレスは既に登録されています。"],
        },
      });
    });
  });

  describe("mutation flow", () => {
    it("calls CSRF then /auth/register and invalidates the me query on success", async () => {
      // 1st: csrf, 2nd: register
      fetchMock
        .mockResolvedValueOnce(jsonResponse(204))
        .mockResolvedValueOnce(jsonResponse(204));

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");

      const runMutation = async (input: typeof validInput) => {
        await getCsrfCookie();
        await registerRequest(input);
        await client.invalidateQueries({ queryKey: queryKeys.auth.me });
      };

      await runMutation(validInput);

      const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      const [registerUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);
      expect(registerUrl).toMatch(/\/auth\/register$/);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.auth.me,
      });
    });
  });
});
