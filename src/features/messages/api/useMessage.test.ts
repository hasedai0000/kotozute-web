import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMessage } from "./useMessage";

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

describe("fetchMessage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the message on 200", async () => {
    const payload = {
      message: {
        id: "m1",
        recipient: "妻へ",
        body: "ありがとう。",
        timing: "posthumous" as const,
      },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

    await expect(fetchMessage("m1")).resolves.toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/\/messages\/m1$/);
  });

  it("throws ApiError on 404", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }, "Not Found"),
    );

    await expect(fetchMessage("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("encodes the id in the URL", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        message: {
          id: "id with space",
          recipient: "",
          body: "",
          timing: "posthumous" as const,
        },
      }),
    );
    await fetchMessage("id with space");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/\/messages\/id%20with%20space$/);
  });
});
