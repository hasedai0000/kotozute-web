import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { patchNoteFields } from "./usePatchNoteFields";

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

describe("patchNoteFields", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PATCHes /note-fields/:section wrapping the diff under { fields }", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    await patchNoteFields("basic", { full_name: "太郎" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/note-fields\/basic$/);
    expect(init.method).toBe("PATCH");
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ fields: { full_name: "太郎" } }));
  });

  it("attaches X-XSRF-TOKEN header when the cookie is present", async () => {
    document.cookie = "XSRF-TOKEN=csrf-value";
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    await patchNoteFields("basic", {});

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-XSRF-TOKEN")).toBe("csrf-value");
  });

  it("throws on 500 responses", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500));
    await expect(
      patchNoteFields("basic", { full_name: "x" }),
    ).rejects.toThrow();
  });
});
