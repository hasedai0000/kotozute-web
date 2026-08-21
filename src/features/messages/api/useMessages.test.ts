import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMessages } from "./useMessages";

const jsonResponse = (
  status: number,
  body: unknown,
  statusText = "",
): Response =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

describe("fetchMessages", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the messages on 200", async () => {
    const payload = {
      messages: [
        {
          id: "m1",
          recipient: "妻へ",
          body: "ありがとう。",
          timing: "posthumous" as const,
        },
      ],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

    await expect(fetchMessages()).resolves.toEqual(payload);
  });

  it("returns an empty list on 404 (endpoint not yet implemented)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }, "Not Found"),
    );

    await expect(fetchMessages()).resolves.toEqual({ messages: [] });
  });

  it("rethrows other errors (e.g. 500)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(fetchMessages()).rejects.toMatchObject({ status: 500 });
  });
});
