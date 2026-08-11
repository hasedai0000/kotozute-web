import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SECTION_ORDER } from "../constants/sections";

import { fetchNoteSummary } from "./useNoteSummary";

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

describe("fetchNoteSummary", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the summary on 200", async () => {
    const payload = {
      perSection: {
        basic: { filledFields: 2, entryCountByCategory: {} },
        medical: { filledFields: 0, entryCountByCategory: {} },
        money: {
          filledFields: 0,
          entryCountByCategory: { bank_account: 1 },
        },
        digital: { filledFields: 0, entryCountByCategory: {} },
        funeral: { filledFields: 0, entryCountByCategory: {} },
        pet: { filledFields: 0, entryCountByCategory: {} },
        other: { filledFields: 0, entryCountByCategory: {} },
      },
      messagesCount: 3,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, payload));

    await expect(fetchNoteSummary()).resolves.toEqual(payload);
  });

  it("returns an empty summary on 404 (endpoint not yet implemented)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { message: "Not Found" }, "Not Found"),
    );

    const result = await fetchNoteSummary();
    expect(result.messagesCount).toBe(0);
    for (const slug of SECTION_ORDER) {
      expect(result.perSection[slug].filledFields).toBe(0);
      expect(result.perSection[slug].entryCountByCategory).toEqual({});
    }
  });

  it("rethrows other errors (e.g. 500)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "boom" }, "Server Error"),
    );

    await expect(fetchNoteSummary()).rejects.toMatchObject({ status: 500 });
  });
});
