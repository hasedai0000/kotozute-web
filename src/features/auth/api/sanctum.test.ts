import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCsrfCookie, readXsrfToken } from "./sanctum";

const jsonResponse = (status: number, statusText = ""): Response =>
  new Response(null, { status, statusText });

describe("sanctum helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("readXsrfToken", () => {
    it("returns null when no XSRF cookie is present", () => {
      expect(readXsrfToken()).toBeNull();
    });

    it("URL-decodes the XSRF cookie value", () => {
      document.cookie = "XSRF-TOKEN=hello%3Dworld";
      expect(readXsrfToken()).toBe("hello=world");
    });
  });

  describe("getCsrfCookie", () => {
    it("hits /sanctum/csrf-cookie (outside /api prefix) with credentials", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await getCsrfCookie();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/sanctum\/csrf-cookie$/);
      expect(url).not.toContain("/api/sanctum");
      expect(init.credentials).toBe("include");
    });
  });
});
