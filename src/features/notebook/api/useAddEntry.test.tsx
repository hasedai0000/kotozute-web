import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { addNoteEntry, useAddEntry } from "./useAddEntry";
import type { NoteEntriesResponse } from "./useEntries";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("sonner");

const jsonResponse = (status: number, body: unknown = null): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? undefined : { "Content-Type": "application/json" },
  });

const wrapWith = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

describe("addNoteEntry", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs /note-entries/:section with category / values / timing (default always)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: "srv-1",
        category: "bank_account",
        values: { bank_name: "◯銀行" },
        timing: "always",
      }),
    );
    await addNoteEntry("money", {
      category: "bank_account",
      values: { bank_name: "◯銀行" },
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/note-entries\/money$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({
        category: "bank_account",
        values: { bank_name: "◯銀行" },
        timing: "always",
      }),
    );
  });

  it("attaches X-XSRF-TOKEN when the cookie is present", async () => {
    document.cookie = "XSRF-TOKEN=csrf-value";
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "1" }));
    await addNoteEntry("money", { category: "bank_account", values: {} });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("X-XSRF-TOKEN")).toBe("csrf-value");
  });
});

describe("useAddEntry (optimistic update + rollback)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const setup = () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const key = queryKeys.notebook.entries("money");
    client.setQueryData<NoteEntriesResponse>(key, { entries: [] });
    return { client, key };
  };

  it("optimistically appends a temp entry then replaces it with server entry on success", async () => {
    const { client, key } = setup();
    // fetch を手動で解決する deferred promise。onMutate 直後の temp 状態を確実に観測する。
    let resolveFetch!: (r: Response) => void;
    const pending = new Promise<Response>((res) => {
      resolveFetch = res;
    });
    fetchMock.mockReturnValueOnce(pending);

    const { result } = renderHook(() => useAddEntry("money"), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({
        category: "bank_account",
        values: { bank_name: "◯銀行" },
      });
    });

    // fetch は未解決の間：temp エントリが配列に入っている
    await waitFor(() => {
      const snap = client.getQueryData<NoteEntriesResponse>(key);
      expect(snap?.entries.length).toBe(1);
      expect(snap?.entries[0].id).toMatch(/^temp-/);
    });

    // fetch を解決 → onSuccess で id がサーバ id に置換される
    resolveFetch(
      jsonResponse(200, {
        id: "srv-1",
        category: "bank_account",
        values: { bank_name: "◯銀行" },
        timing: "always",
      }),
    );

    await waitFor(() => {
      const snap = client.getQueryData<NoteEntriesResponse>(key);
      expect(snap?.entries[0].id).toBe("srv-1");
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("追加しました");
  });

  it("rolls back to the previous cache on network failure", async () => {
    const { client, key } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Network down"));

    const { result } = renderHook(() => useAddEntry("money"), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({
        category: "bank_account",
        values: { bank_name: "◯銀行" },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const snap = client.getQueryData<NoteEntriesResponse>(key);
    expect(snap).toEqual({ entries: [] });
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("追加できませんでした");
  });
});
