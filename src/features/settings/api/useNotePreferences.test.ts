import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNotePreferences } from "./useNotePreferences";

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

describe("fetchNotePreferences", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps snake_case response into the camelCase shape", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        default_timing: "posthumous",
        grace_period_days: 14,
      }),
    );

    await expect(fetchNotePreferences()).resolves.toEqual({
      defaultTiming: "posthumous",
      gracePeriodDays: 14,
    });
  });

  it("falls back to defaults when the response omits fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await expect(fetchNotePreferences()).resolves.toEqual({
      defaultTiming: "always",
      gracePeriodDays: 7,
    });
  });

  it("returns defaults on 404 (no record yet for first-time user)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }, "Not Found"),
    );

    await expect(fetchNotePreferences()).resolves.toEqual({
      defaultTiming: "always",
      gracePeriodDays: 7,
    });
  });

  it("rethrows other errors (e.g. 500)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(fetchNotePreferences()).rejects.toMatchObject({ status: 500 });
  });
});
