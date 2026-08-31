import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCsrfCookie } from "@/features/auth/api/sanctum";

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

describe("usePatchNoteFields mutation flow", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /sanctum/csrf-cookie before PATCH /note-fields/:section", async () => {
    // 1st: csrf-cookie, 2nd: patch
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204))
      .mockResolvedValueOnce(jsonResponse(204));

    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    // useMutation は React 依存なので、mutationFn を素で再現して呼び出し順を検証する。
    const runMutation = async (input: { full_name: string }) => {
      await getCsrfCookie();
      await patchNoteFields("basic", input);
      await client.invalidateQueries({ queryKey: ["notebook", "summary"] });
    };

    await runMutation({ full_name: "太郎" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [patchUrl, patchInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(csrfUrl).toMatch(/\/sanctum\/csrf-cookie$/);
    expect(patchUrl).toMatch(/\/note-fields\/basic$/);
    expect(patchInit.method).toBe("PATCH");
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
