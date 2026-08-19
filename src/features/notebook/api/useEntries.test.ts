import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNoteEntries } from "./useEntries";

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

describe("fetchNoteEntries", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed entries on 200", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        entries: [
          {
            id: "1",
            category: "bank_account",
            values: { bank_name: "◯銀行" },
            timing: "always",
          },
        ],
      }),
    );
    const res = await fetchNoteEntries("money");
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]).toMatchObject({
      id: "1",
      category: "bank_account",
      timing: "always",
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/\/note-entries\/money$/);
  });

  it("falls back to empty entries on 404 (バック未実装 or 未登録)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404));
    await expect(fetchNoteEntries("money")).resolves.toEqual({ entries: [] });
  });

  it("throws for other error responses (500)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500));
    await expect(fetchNoteEntries("money")).rejects.toThrow();
  });
});
