import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query/queryKeys";

import { updateNoteEntry, useUpdateEntry } from "./useUpdateEntry";
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

const initialEntry: NoteEntry = {
  id: "e1",
  category: "bank_account",
  values: { bank_name: "旧銀行" },
  timing: "always",
};

const wrapWith = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

describe("updateNoteEntry", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PATCHes /note-entries/:section/:id with only provided fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, initialEntry));
    await updateNoteEntry("money", {
      id: "e1",
      values: { bank_name: "新銀行" },
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/note-entries\/money\/e1$/);
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(
      JSON.stringify({ values: { bank_name: "新銀行" } }),
    );
  });
});

describe("useUpdateEntry (optimistic update + rollback)", () => {
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
    client.setQueryData<NoteEntriesResponse>(key, { entries: [initialEntry] });
    return { client, key };
  };

  it("optimistically updates the entry and confirms on success", async () => {
    const { client, key } = setup();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ...initialEntry,
        values: { bank_name: "新銀行" },
      }),
    );

    const { result } = renderHook(() => useUpdateEntry("money"), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({ id: "e1", values: { bank_name: "新銀行" } });
    });

    await waitFor(() => {
      const snap = client.getQueryData<NoteEntriesResponse>(key);
      expect(snap?.entries[0].values.bank_name).toBe("新銀行");
    });

    await waitFor(() =>
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith("更新しました"),
    );
  });

  it("rolls back the entry values on failure", async () => {
    const { client, key } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Network down"));

    const { result } = renderHook(() => useUpdateEntry("money"), {
      wrapper: wrapWith(client),
    });

    act(() => {
      result.current.mutate({ id: "e1", values: { bank_name: "新銀行" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const snap = client.getQueryData<NoteEntriesResponse>(key);
    expect(snap?.entries[0].values.bank_name).toBe("旧銀行");
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("更新できませんでした");
  });
});
