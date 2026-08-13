import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNoteFields } from "./useNoteFields";

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

describe("fetchNoteFields", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed fields on 200", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { fields: { full_name: "太郎" } }),
    );
    await expect(fetchNoteFields("basic")).resolves.toEqual({
      fields: { full_name: "太郎" },
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toMatch(/\/note-fields\/basic$/);
  });

  it("falls back to empty fields on 404 (バック未実装 or 未保存)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404));
    await expect(fetchNoteFields("basic")).resolves.toEqual({ fields: {} });
  });

  it("throws for other error responses (500)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500));
    await expect(fetchNoteFields("basic")).rejects.toThrow();
  });
});
