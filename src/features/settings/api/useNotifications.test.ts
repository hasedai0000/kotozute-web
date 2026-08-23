import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNotifications } from "./useNotifications";

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

describe("fetchNotifications", () => {
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
      jsonResponse(200, { reminder_enabled: true }),
    );

    await expect(fetchNotifications()).resolves.toEqual({
      reminderEnabled: true,
    });
  });

  it("falls back to false when the response omits the field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await expect(fetchNotifications()).resolves.toEqual({
      reminderEnabled: false,
    });
  });

  it("returns default false on 404 (no record yet for first-time user)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }, "Not Found"),
    );

    await expect(fetchNotifications()).resolves.toEqual({
      reminderEnabled: false,
    });
  });

  it("rethrows other errors (e.g. 500)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(fetchNotifications()).rejects.toMatchObject({ status: 500 });
  });
});
