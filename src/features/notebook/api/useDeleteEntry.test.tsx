import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { deleteNoteEntry, useDeleteEntry } from "./useDeleteEntry";
import type { NoteEntriesResponse, NoteEntry } from "./useEntries";

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

const entryA: NoteEntry = {
  id: "e1",
  category: "bank_account",
  values: { bank_name: "◯銀行" },
  timing: "always",
};
const entryB: NoteEntry = {
  id: "e2",
  category: "insurance",
  values: { insurer: "△保険" },
  timing: "always",
};

const wrapWith = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

describe("deleteNoteEntry", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETEs /note-entries/:section/:id", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204));
    await deleteNoteEntry("money", { id: "e1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/note-entries\/money\/e1$/);
    expect(init.method).toBe("DELETE");
  });
});

describe("useDeleteEntry (optimistic remove + rollback)", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
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
    client.setQueryData<NoteEntriesResponse>(key, {
      entries: [entryA, entryB],
    });
    return { client, key };
  };

  it("optimistically removes the entry on success", async () => {
    const { client, key } = setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(204));

    const { result } = renderHook(() => useDeleteEntry("money"), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({ id: "e1" });
    });

    await waitFor(() => {
      const snap = client.getQueryData<NoteEntriesResponse>(key);
      expect(snap?.entries).toEqual([entryB]);
    });

    await waitFor(() =>
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("削除しました"),
    );
  });

  it("rolls back removal when the request fails (DoD: 巻き戻る)", async () => {
    const { client, key } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Network down"));

    const { result } = renderHook(() => useDeleteEntry("money"), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({ id: "e1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const snap = client.getQueryData<NoteEntriesResponse>(key);
    expect(snap?.entries).toEqual([entryA, entryB]);
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("削除できませんでした");
  });
});
