import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { changePasswordRequest } from "./useChangePassword";

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

describe("useChangePassword helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("changePasswordRequest", () => {
    it("PUTs to /user/password with snake_case body and the XSRF header", async () => {
      document.cookie = "XSRF-TOKEN=raw-token-value";
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await changePasswordRequest({
        currentPassword: "current123",
        newPassword: "newpass123",
        newPasswordConfirmation: "newpass123",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/user\/password$/);
      expect(init.method).toBe("PUT");
      const headers = new Headers(init.headers);
      expect(headers.get("X-XSRF-TOKEN")).toBe("raw-token-value");
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(init.body).toBe(
        JSON.stringify({
          current_password: "current123",
          password: "newpass123",
          password_confirmation: "newpass123",
        }),
      );
    });

    it("surfaces a 422 field error on current_password when the current one is wrong", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          422,
          {
            message: "The given data was invalid.",
            errors: {
              current_password: ["現在のパスワードが正しくありません。"],
            },
          },
          "Unprocessable Entity",
        ),
      );

      await expect(
        changePasswordRequest({
          currentPassword: "wrong",
          newPassword: "newpass123",
          newPasswordConfirmation: "newpass123",
        }),
      ).rejects.toMatchObject({
        status: 422,
        fields: {
          current_password: ["現在のパスワードが正しくありません。"],
        },
      });
    });
  });
});
